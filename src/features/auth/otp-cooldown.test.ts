import { describe, expect, it, beforeEach } from "vitest";
import {
  markCodeSent,
  getResendCooldownRemaining,
  OTP_SENT_STORAGE_KEY,
  RESEND_COOLDOWN_SECONDS,
} from "./otp-cooldown";

/** Every localStorage key currently set, for leak assertions. */
function storedKeys(): string[] {
  return Object.keys(localStorage);
}

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
    expect(getResendCooldownRemaining("a@example.com")).toBeGreaterThan(0);
  });

  it("keys per email (case/space-insensitive)", () => {
    markCodeSent("  A@Example.com ");
    expect(getResendCooldownRemaining("a@example.com")).toBeGreaterThan(0);
    expect(getResendCooldownRemaining("other@example.com")).toBe(0);
  });

  it("tracks several addresses independently", () => {
    markCodeSent("a@example.com");
    markCodeSent("b@example.com");

    expect(getResendCooldownRemaining("a@example.com")).toBeGreaterThan(0);
    expect(getResendCooldownRemaining("b@example.com")).toBeGreaterThan(0);
  });

  // #225: the address itself used to be the localStorage key
  // (`velanto:otp-sent:someone@example.com`), in plaintext, readable by anyone
  // with the browser. On a shared machine that accumulated the address of every
  // person who ever asked for a code.
  describe("does not retain the email address", () => {
    it("stores no plaintext address anywhere in localStorage", () => {
      markCodeSent("someone@example.com");

      const dump =
        storedKeys().join("|") +
        "|" +
        (localStorage.getItem(OTP_SENT_STORAGE_KEY) ?? "");
      expect(dump).not.toContain("someone@example.com");
      expect(dump).not.toContain("someone");
      expect(dump).not.toContain("example.com");
    });

    it("uses exactly one key regardless of how many addresses are seen", () => {
      markCodeSent("a@example.com");
      markCodeSent("b@example.com");
      markCodeSent("c@example.com");

      expect(storedKeys()).toEqual([OTP_SENT_STORAGE_KEY]);
    });
  });

  // #225: nothing ever removed the entry — no cleanup, no expiry. A 60-second
  // guard was retaining a personal identifier indefinitely, including past
  // logout. The record must not outlive the cooldown it exists to enforce.
  describe("does not outlive the cooldown", () => {
    it("treats the cooldown as elapsed once the timestamp is old enough", () => {
      markCodeSent("a@example.com");
      writeRawEntry(
        "a@example.com",
        Date.now() - (RESEND_COOLDOWN_SECONDS + 5) * 1000,
      );

      expect(getResendCooldownRemaining("a@example.com")).toBe(0);
    });

    it("drops an expired entry on read, rather than leaving it to rot", () => {
      markCodeSent("a@example.com");
      writeRawEntry(
        "a@example.com",
        Date.now() - (RESEND_COOLDOWN_SECONDS + 5) * 1000,
      );

      getResendCooldownRemaining("a@example.com");

      expect(localStorage.getItem(OTP_SENT_STORAGE_KEY)).toBeNull();
    });

    it("removes the key entirely once the last entry expires", () => {
      markCodeSent("a@example.com");
      writeRawEntry(
        "a@example.com",
        Date.now() - (RESEND_COOLDOWN_SECONDS + 5) * 1000,
      );

      markCodeSent("b@example.com");
      const stored = localStorage.getItem(OTP_SENT_STORAGE_KEY) ?? "";

      // b's entry survives; a's was swept on write, so exactly one remains.
      expect(Object.keys(JSON.parse(stored))).toHaveLength(1);
      expect(getResendCooldownRemaining("a@example.com")).toBe(0);
      expect(getResendCooldownRemaining("b@example.com")).toBeGreaterThan(0);
    });
  });

  describe("when storage is hostile", () => {
    it("ignores a corrupt blob rather than throwing", () => {
      localStorage.setItem(OTP_SENT_STORAGE_KEY, "{not json");
      expect(() => getResendCooldownRemaining("a@example.com")).not.toThrow();
      expect(getResendCooldownRemaining("a@example.com")).toBe(0);
    });

    it("ignores a non-object blob", () => {
      localStorage.setItem(OTP_SENT_STORAGE_KEY, '"a string"');
      expect(getResendCooldownRemaining("a@example.com")).toBe(0);
    });

    it("ignores a non-numeric timestamp", () => {
      localStorage.setItem(OTP_SENT_STORAGE_KEY, '{"abc":"nonsense"}');
      expect(getResendCooldownRemaining("a@example.com")).toBe(0);
    });

    // A clock moved backwards (or a tampered entry) must not strand the user
    // behind a cooldown longer than the one they agreed to.
    it("clamps a future timestamp to the cooldown length", () => {
      writeRawEntry("a@example.com", Date.now() + 60 * 60 * 1000);
      expect(getResendCooldownRemaining("a@example.com")).toBeLessThanOrEqual(
        RESEND_COOLDOWN_SECONDS,
      );
    });

    it("recovers from a corrupt blob on the next send", () => {
      localStorage.setItem(OTP_SENT_STORAGE_KEY, "{not json");
      markCodeSent("a@example.com");
      expect(getResendCooldownRemaining("a@example.com")).toBeGreaterThan(0);
    });
  });
});

/**
 * Rewrites an existing entry's timestamp without knowing the hash function —
 * finds the single entry `markCodeSent(email)` just wrote and back-dates it.
 * Keeps the tests from encoding the hash, which is an implementation detail.
 */
function writeRawEntry(email: string, timestampMs: number): void {
  const before = new Set(
    Object.keys(JSON.parse(localStorage.getItem(OTP_SENT_STORAGE_KEY) ?? "{}")),
  );
  markCodeSent(email);
  const after = JSON.parse(localStorage.getItem(OTP_SENT_STORAGE_KEY) ?? "{}");
  const hash =
    Object.keys(after).find((k) => !before.has(k)) ?? Object.keys(after)[0];
  after[hash] = timestampMs;
  localStorage.setItem(OTP_SENT_STORAGE_KEY, JSON.stringify(after));
}
