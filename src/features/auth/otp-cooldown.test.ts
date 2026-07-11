import { describe, expect, it, beforeEach } from "vitest";
import {
  markCodeSent,
  getResendCooldownRemaining,
  RESEND_COOLDOWN_SECONDS,
} from "./otp-cooldown";

describe("otp-cooldown", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns 0 when no code has been sent", () => {
    expect(getResendCooldownRemaining("a@example.com")).toBe(0);
  });

  it("starts a ~60s cooldown after a send", () => {
    markCodeSent("a@example.com");
    const remaining = getResendCooldownRemaining("a@example.com");
    expect(remaining).toBeGreaterThan(RESEND_COOLDOWN_SECONDS - 3);
    expect(remaining).toBeLessThanOrEqual(RESEND_COOLDOWN_SECONDS);
  });

  it("persists across a 'refresh' (reads the stored timestamp, not in-memory state)", () => {
    markCodeSent("a@example.com");
    // A fresh module read (as after refresh) still sees the cooldown via storage.
    expect(getResendCooldownRemaining("a@example.com")).toBeGreaterThan(0);
  });

  it("treats the cooldown as elapsed once the timestamp is old enough", () => {
    const past = Date.now() - (RESEND_COOLDOWN_SECONDS + 5) * 1000;
    localStorage.setItem("velanto:otp-sent:a@example.com", String(past));
    expect(getResendCooldownRemaining("a@example.com")).toBe(0);
  });

  it("keys per email (case/space-insensitive) and ignores corrupt values", () => {
    markCodeSent("  A@Example.com ");
    expect(getResendCooldownRemaining("a@example.com")).toBeGreaterThan(0);
    expect(getResendCooldownRemaining("other@example.com")).toBe(0);

    localStorage.setItem(
      "velanto:otp-sent:corrupt@example.com",
      "not-a-number",
    );
    expect(getResendCooldownRemaining("corrupt@example.com")).toBe(0);
  });
});
