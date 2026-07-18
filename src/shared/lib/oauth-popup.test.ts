import { describe, it, expect, vi, afterEach } from "vitest";
import { openOAuthPopup } from "./oauth-popup";

// NEXT_PUBLIC_API_URL is unset in tests, so the util's backend origin is the
// default localhost:3001 — that's the only origin it trusts messages from.
const API_ORIGIN = "http://localhost:3001";

function post(origin: string, data: unknown) {
  window.dispatchEvent(new MessageEvent("message", { origin, data }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openOAuthPopup", () => {
  it("resolves ok on a valid success message from the backend origin", async () => {
    vi.stubGlobal("open", vi.fn(() => ({ closed: false })));
    const promise = openOAuthPopup("google");
    post(API_ORIGIN, { source: "velanto-oauth", ok: true });
    await expect(promise).resolves.toEqual({ ok: true });
  });

  it("reports a failed round-trip as an oauth error", async () => {
    vi.stubGlobal("open", vi.fn(() => ({ closed: false })));
    const promise = openOAuthPopup("discord");
    post(API_ORIGIN, { source: "velanto-oauth", ok: false });
    await expect(promise).resolves.toEqual({ ok: false, error: "oauth" });
  });

  it("ignores a spoofed message from another origin", async () => {
    vi.stubGlobal("open", vi.fn(() => ({ closed: false })));
    const promise = openOAuthPopup("google");
    // An attacker's window claims success from a different origin — must be
    // ignored; only our backend's (here, a failure) resolves the promise.
    post("https://evil.example", { source: "velanto-oauth", ok: true });
    post(API_ORIGIN, { source: "velanto-oauth", ok: false });
    await expect(promise).resolves.toEqual({ ok: false, error: "oauth" });
  });

  it("ignores a message that lacks the source marker", async () => {
    vi.stubGlobal("open", vi.fn(() => ({ closed: false })));
    const promise = openOAuthPopup("google");
    post(API_ORIGIN, { ok: true }); // no source: "velanto-oauth"
    post(API_ORIGIN, { source: "velanto-oauth", ok: true });
    await expect(promise).resolves.toEqual({ ok: true });
  });

  it("resolves blocked when the browser blocks the popup", async () => {
    vi.stubGlobal("open", vi.fn(() => null));
    await expect(openOAuthPopup("discord")).resolves.toEqual({
      ok: false,
      error: "blocked",
    });
  });
});
