import { describe, it, expect } from "vitest";
import { negotiateLocale } from "./locale";
import { isRtl } from "./config";

describe("negotiateLocale", () => {
  it("returns the default (en) for an empty or missing header", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("")).toBe("en");
  });

  it("matches an exact supported locale", () => {
    expect(negotiateLocale("uk")).toBe("uk");
    expect(negotiateLocale("ar")).toBe("ar");
  });

  it("matches on the base subtag (region ignored)", () => {
    expect(negotiateLocale("pt-BR")).toBe("pt");
    expect(negotiateLocale("zh-Hans-CN")).toBe("zh");
  });

  it("respects q-value ordering, picking the highest supported", () => {
    expect(negotiateLocale("de;q=1.0, uk;q=0.8, en;q=0.5")).toBe("uk");
  });

  it("skips unsupported languages and falls back to en", () => {
    expect(negotiateLocale("de-DE,ja;q=0.9")).toBe("en");
  });
});

describe("isRtl", () => {
  it("is true only for Arabic and Urdu", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("ur")).toBe(true);
    expect(isRtl("en")).toBe(false);
    expect(isRtl("uk")).toBe(false);
  });
});
