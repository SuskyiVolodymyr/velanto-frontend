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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authHeader(init?: RequestInit): string | undefined {
  return (init?.headers as Record<string, string> | undefined)?.Authorization;
}

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
