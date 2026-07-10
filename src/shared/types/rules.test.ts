import { describe, expect, it } from "vitest";
import { BAN_REASONS, type BanReason } from "./rules";

describe("BAN_REASONS", () => {
  it("is the 12 stable category ids plus the 'other' catch-all", () => {
    expect(BAN_REASONS).toEqual([
      "hate_discrimination",
      "harassment_bullying",
      "violence_harm",
      "sexual_content",
      "child_safety",
      "illegal_content",
      "privacy_doxxing",
      "impersonation_deception",
      "spam_manipulation",
      "misinformation",
      "intellectual_property",
      "platform_integrity",
      "other",
    ]);
  });

  it("has exactly 13 entries (12 categories + 'other') with no duplicates", () => {
    expect(BAN_REASONS).toHaveLength(13);
    expect(new Set(BAN_REASONS).size).toBe(BAN_REASONS.length);
  });

  it("includes 'other' as the final catch-all", () => {
    expect(BAN_REASONS[BAN_REASONS.length - 1]).toBe("other");
  });

  it("derives a literal-union BanReason type, not string", () => {
    // Compile-time: only members of the tuple are assignable. A bogus value
    // would fail typecheck; the runtime guard mirrors the type's intent.
    const reason: BanReason = "spam_manipulation";
    expect(BAN_REASONS).toContain(reason);
  });
});
