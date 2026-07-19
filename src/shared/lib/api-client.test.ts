import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureApiError = vi.fn();
const captureNetworkError = vi.fn();

vi.mock("@/src/shared/lib/sentry-reporting", () => ({
  captureApiError: (...args: unknown[]) => captureApiError(...args),
  captureNetworkError: (...args: unknown[]) => captureNetworkError(...args),
}));

import {
  apiClient,
  ApiError,
  setAccessToken,
  setSessionCallbacks,
} from "@/src/shared/lib/api-client";
// Imported to prove the auth-client's refresh shares the same single-flight
// promise as the api-client's own 401 renewal (see the regression test below).
import { authClient } from "@/src/shared/lib/auth-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authHeader(init?: RequestInit): string | undefined {
  return (init?.headers as Record<string, string> | undefined)?.Authorization;
}

// A minimal (unsigned) JWT carrying just an `exp` claim, so the client can read
// expiry the way it does for real access tokens.
function fakeJwt(expSeconds: number): string {
  const seg = (o: object) =>
    btoa(JSON.stringify(o))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${seg({ alg: "HS256", typ: "JWT" })}.${seg({ sub: "u1", exp: expSeconds })}.sig`;
}
const nowSeconds = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
  captureApiError.mockClear();
  captureNetworkError.mockClear();
  setAccessToken(null);
  setSessionCallbacks(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
  setSessionCallbacks(null);
});

describe("apiClient error reporting", () => {
  it("returns data and reports nothing on a 2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })),
    );

    await expect(apiClient.get("/packs")).resolves.toEqual({ ok: true });
    expect(captureApiError).not.toHaveBeenCalled();
    expect(captureNetworkError).not.toHaveBeenCalled();
  });

  it("reports a 5xx response with method + path context, then throws ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(503, { message: "down" })),
    );

    await expect(apiClient.get("/packs")).rejects.toBeInstanceOf(ApiError);
    expect(captureApiError).toHaveBeenCalledWith(503, expect.any(String), {
      method: "GET",
      path: "/packs",
    });
  });

  it("delegates the 4xx capture decision to captureApiError (which no-ops)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(404, { message: "nope" })),
    );

    await expect(apiClient.get("/packs/x")).rejects.toBeInstanceOf(ApiError);
    // api-client always forwards; the reporting layer decides 4xx isn't captured.
    expect(captureApiError).toHaveBeenCalledWith(404, expect.any(String), {
      method: "GET",
      path: "/packs/x",
    });
  });

  it("reports a network failure (fetch rejects) and rethrows", async () => {
    const boom = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(boom));

    await expect(apiClient.post("/packs", { a: 1 })).rejects.toBe(boom);
    expect(captureNetworkError).toHaveBeenCalledWith(boom, {
      method: "POST",
      path: "/packs",
    });
  });
});

describe("apiClient silent token refresh on 401", () => {
  it("refreshes the access token and retries once when an authenticated request 401s", async () => {
    setAccessToken("stale");
    const onRefreshed = vi.fn();
    setSessionCallbacks({ onRefreshed, onLost: vi.fn() });

    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(
          jsonResponse(200, { accessToken: "fresh", user: { id: "u1" } }),
        );
      }
      // Only the retry (which carries the fresh token) succeeds.
      return Promise.resolve(
        authHeader(init) === "Bearer fresh"
          ? jsonResponse(200, { count: 3 })
          : jsonResponse(401, { message: "jwt expired" }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.get("/notifications/unread-count")).resolves.toEqual(
      { count: 3 },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/refresh"),
      expect.anything(),
    );
    expect(onRefreshed).toHaveBeenCalledWith({ id: "u1" });
  });

  it("does not attempt a refresh on a 401 when no token is set (anonymous)", async () => {
    setAccessToken(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { message: "unauthorized" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiClient.get("/notifications/unread-count"),
    ).rejects.toBeInstanceOf(ApiError);
    // One call only — no /auth/refresh dance for a request we never authed.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes only once for concurrent 401s", async () => {
    setAccessToken("stale");
    setSessionCallbacks({ onRefreshed: vi.fn(), onLost: vi.fn() });
    let refreshCalls = 0;

    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(
          jsonResponse(200, { accessToken: "fresh", user: { id: "u1" } }),
        );
      }
      return Promise.resolve(
        authHeader(init) === "Bearer fresh"
          ? jsonResponse(200, { ok: true })
          : jsonResponse(401, { message: "jwt expired" }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const [a, b] = await Promise.all([
      apiClient.get("/a"),
      apiClient.get("/b"),
    ]);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
  });

  it("clears the session and throws the original 401 when the refresh also fails", async () => {
    setAccessToken("stale");
    const onLost = vi.fn();
    setSessionCallbacks({ onRefreshed: vi.fn(), onLost });

    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith("/auth/refresh")
          ? jsonResponse(401, { message: "refresh expired" })
          : jsonResponse(401, { message: "jwt expired" }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiClient.get("/notifications/unread-count"),
    ).rejects.toMatchObject({ status: 401 });
    expect(onLost).toHaveBeenCalled();
  });

  // Regression guard for the frequent-logout bug: authClient.refresh() (used by
  // AuthProvider on every mount, and by revalidate) used to POST /auth/refresh
  // directly, bypassing the single-flight mutex. It could then run in parallel
  // with a 401-triggered renewal — two refreshes, same cookie — and the server's
  // single-use rotation 401'd the loser, logging the user out at random.
  it("collapses a concurrent authClient.refresh() and a 401 renewal into one rotation", async () => {
    setAccessToken("stale");
    setSessionCallbacks({ onRefreshed: vi.fn(), onLost: vi.fn() });

    let refreshCalls = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(
          jsonResponse(200, {
            accessToken: "fresh",
            user: { id: "u1", username: "vova" },
          }),
        );
      }
      return Promise.resolve(jsonResponse(401, { message: "jwt expired" }));
    });
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([
      authClient.refresh(),
      apiClient.get("/notifications/unread-count").catch(() => undefined),
    ]);

    expect(refreshCalls).toBe(1);
  });

  // Only a 401 proves the refresh cookie is gone. A 429 from the refresh
  // throttle, a 5xx, or a backend restart mid-deploy is transient — tearing the
  // session down there logged every active user out during an outage.
  it("keeps the session when the refresh fails transiently (5xx) instead of logging out", async () => {
    setAccessToken("stale");
    const onLost = vi.fn();
    setSessionCallbacks({ onRefreshed: vi.fn(), onLost });

    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith("/auth/refresh")
          ? jsonResponse(503, { message: "backend restarting" })
          : jsonResponse(401, { message: "jwt expired" }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiClient.get("/notifications/unread-count"),
    ).rejects.toMatchObject({ status: 401 });
    expect(onLost).not.toHaveBeenCalled();
  });

  it("keeps the session when the refresh fails with a network error", async () => {
    setAccessToken("stale");
    const onLost = vi.fn();
    setSessionCallbacks({ onRefreshed: vi.fn(), onLost });

    const fetchMock = vi.fn((url: string) =>
      url.endsWith("/auth/refresh")
        ? Promise.reject(new TypeError("Failed to fetch"))
        : Promise.resolve(jsonResponse(401, { message: "jwt expired" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiClient.get("/notifications/unread-count"),
    ).rejects.toMatchObject({ status: 401 });
    expect(onLost).not.toHaveBeenCalled();
  });

  it("does not recurse when /auth/refresh itself is the 401ing request", async () => {
    setAccessToken("stale");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { message: "jwt expired" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.post("/auth/refresh")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("apiClient proactive refresh of an expired token", () => {
  it("renews an expired token before sending so an optional-auth request keeps its identity", async () => {
    setAccessToken(fakeJwt(nowSeconds() - 60)); // already expired
    const onRefreshed = vi.fn();
    setSessionCallbacks({ onRefreshed, onLost: vi.fn() });
    const fresh = fakeJwt(nowSeconds() + 3600);

    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(
          jsonResponse(200, { accessToken: fresh, user: { id: "u1" } }),
        );
      }
      // Optional-auth endpoint: 200 for anyone. Echo who it saw so the test can
      // assert the play was attributed, not recorded anonymously.
      return Promise.resolve(
        jsonResponse(200, { id: "p1", seen: authHeader(init) ?? null }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiClient.post("/packs/x/plays", { picks: [] }),
    ).resolves.toEqual({ id: "p1", seen: `Bearer ${fresh}` });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/refresh"),
      expect.anything(),
    );
    expect(onRefreshed).toHaveBeenCalledWith({ id: "u1" });
  });

  it("proceeds anonymously when the pre-emptive refresh fails", async () => {
    setAccessToken(fakeJwt(nowSeconds() - 60));
    const onLost = vi.fn();
    setSessionCallbacks({ onRefreshed: vi.fn(), onLost });

    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(
          jsonResponse(401, { message: "refresh expired" }),
        );
      }
      return Promise.resolve(
        jsonResponse(200, { id: "p1", seen: authHeader(init) ?? null }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiClient.post("/packs/x/plays", { picks: [] }),
    ).resolves.toEqual({ id: "p1", seen: null });
    expect(onLost).toHaveBeenCalled();
  });

  it("does not refresh a still-valid token", async () => {
    setAccessToken(fakeJwt(nowSeconds() + 3600));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { id: "p1" }));
    vi.stubGlobal("fetch", fetchMock);

    await apiClient.post("/packs/x/plays", { picks: [] });
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/auth/refresh"),
      expect.anything(),
    );
  });
});
