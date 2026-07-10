import { describe, it, expect } from "vitest";
import { resolveBanReasonTitle } from "./ban-reason-title";
import type { RuleCategory } from "@/src/shared/types/rules";

const CATEGORIES: RuleCategory[] = [
  { id: "spam_manipulation", title: "Spam & Manipulation", rules: [] },
  { id: "hate_discrimination", title: "Hate & Discrimination", rules: [] },
];

describe("resolveBanReasonTitle", () => {
  it("maps a category id to its human title", () => {
    expect(resolveBanReasonTitle("spam_manipulation", CATEGORIES, "Other")).toBe(
      "Spam & Manipulation",
    );
  });

  it("maps 'other' to the supplied localized label without leaking the id", () => {
    expect(resolveBanReasonTitle("other", CATEGORIES, "Autre")).toBe("Autre");
  });

  it("falls back to the raw id when the category is unknown (rules not loaded)", () => {
    expect(resolveBanReasonTitle("spam_manipulation", [], "Other")).toBe("spam_manipulation");
  });

  it("returns null for an empty/null/undefined reason so callers can omit the row", () => {
    expect(resolveBanReasonTitle(null, CATEGORIES, "Other")).toBeNull();
    expect(resolveBanReasonTitle(undefined, CATEGORIES, "Other")).toBeNull();
    expect(resolveBanReasonTitle("", CATEGORIES, "Other")).toBeNull();
  });
});
