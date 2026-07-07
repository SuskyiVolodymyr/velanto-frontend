// src/shared/lib/ban-display.test.ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { formatBanStatus } from "./ban-display";

describe("formatBanStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Not banned' for null", () => {
    expect(formatBanStatus(null)).toBe("Not banned");
  });

  it("returns 'Not banned' for a bannedUntil already in the past", () => {
    expect(formatBanStatus("2020-01-01T00:00:00.000Z")).toBe("Not banned");
  });

  it("returns a formatted date for a near-future ban", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const until = "2026-01-08T00:00:00.000Z";
    expect(formatBanStatus(until)).toBe(`Banned until ${new Date(until).toLocaleDateString()}`);
  });

  it("returns 'Permanently banned' for a ban more than 20 years out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    expect(formatBanStatus("2126-01-01T00:00:00.000Z")).toBe("Permanently banned");
  });
});
