import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureApiError = vi.fn();
const captureNetworkError = vi.fn();

vi.mock("@/src/shared/lib/sentry-reporting", () => ({
  captureApiError: (...args: unknown[]) => captureApiError(...args),
  captureNetworkError: (...args: unknown[]) => captureNetworkError(...args),
}));

import { apiClient, ApiError } from "@/src/shared/lib/api-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  captureApiError.mockClear();
  captureNetworkError.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
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
