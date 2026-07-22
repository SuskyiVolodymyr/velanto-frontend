import { describe, expect, it } from "vitest";
import { formatBytes } from "./format-bytes";

describe("formatBytes", () => {
  it("keeps small sizes in bytes, with no decimal point", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(999)).toBe("999 B");
  });

  // Binary units, because that's what the budgets are defined in: the base
  // budget is 250 * 1024 * 1024, so a decimal MB would render it as "262.1 MB"
  // and no admin would recognise their own limit.
  it("steps up at 1024, not 1000", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
  });

  it("renders the real budgets as the round numbers they are", () => {
    expect(formatBytes(250 * 1024 * 1024)).toBe("250 MB");
    expect(formatBytes(5 * 1024 * 1024 * 1024)).toBe("5 GB");
  });

  // One decimal is enough to tell 1.4 GB from 1.9 GB; more is noise on a
  // dashboard, and a trailing ".0" reads like spurious precision.
  it("shows one decimal only when it carries information", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1_400_000_000)).toBe("1.3 GB");
    expect(formatBytes(2048)).toBe("2 KB");
  });

  it("stops at GB rather than inventing units nothing will reach", () => {
    // The global ceiling is 5 GB; a TB figure here would mean something has
    // gone very wrong, and it should look wrong rather than tidy.
    expect(formatBytes(2048 * 1024 * 1024 * 1024)).toBe("2048 GB");
  });

  // Defensive: a counter should never go negative, but rendering "NaN" or
  // "-1 B" silently is worse than showing a zero an admin can question.
  it("floors a negative or non-finite value at zero", () => {
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });
});
