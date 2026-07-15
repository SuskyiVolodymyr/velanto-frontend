import { beforeEach, describe, expect, it, vi } from "vitest";

const setUser = vi.fn();
const captureException = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  setUser: (...args: unknown[]) => setUser(...args),
  captureException: (...args: unknown[]) => captureException(...args),
}));

import {
  captureApiError,
  captureNetworkError,
  isUnexpectedApiStatus,
  setSentryUser,
} from "@/src/shared/lib/sentry-reporting";

beforeEach(() => {
  setUser.mockClear();
  captureException.mockClear();
});

describe("setSentryUser", () => {
  it("sends only id and username — never the email (no PII)", () => {
    setSentryUser({
      id: "u1",
      username: "volodka",
      email: "secret@example.com",
    } as never);

    expect(setUser).toHaveBeenCalledWith({ id: "u1", username: "volodka" });
    const arg = setUser.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).not.toHaveProperty("email");
  });

  it("clears the Sentry user on logout (null)", () => {
    setSentryUser(null);
    expect(setUser).toHaveBeenCalledWith(null);
  });
});

describe("isUnexpectedApiStatus", () => {
  it("treats 5xx as unexpected", () => {
    expect(isUnexpectedApiStatus(500)).toBe(true);
    expect(isUnexpectedApiStatus(502)).toBe(true);
    expect(isUnexpectedApiStatus(503)).toBe(true);
  });

  it("treats routine 4xx and 2xx as expected (not captured)", () => {
    for (const status of [200, 400, 401, 403, 404, 422, 429]) {
      expect(isUnexpectedApiStatus(status)).toBe(false);
    }
  });
});

describe("captureApiError", () => {
  it("captures a 5xx failure", () => {
    captureApiError(503, "Service Unavailable", {
      method: "GET",
      path: "/packs",
    });
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("does NOT capture routine 4xx failures", () => {
    captureApiError(404, "Not Found", { method: "GET", path: "/packs/x" });
    captureApiError(401, "Unauthorized", { method: "GET", path: "/users/me" });
    expect(captureException).not.toHaveBeenCalled();
  });
});

describe("captureNetworkError", () => {
  it("always captures (fetch never reached the server)", () => {
    captureNetworkError(new Error("Failed to fetch"), {
      method: "POST",
      path: "/packs",
    });
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
