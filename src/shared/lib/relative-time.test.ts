import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./relative-time";

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");

  it("returns 'just now' for under a minute", () => {
    expect(formatRelativeTime("2026-07-08T11:59:30.000Z", now)).toBe("just now");
  });

  it("returns minutes for under an hour", () => {
    expect(formatRelativeTime("2026-07-08T11:45:00.000Z", now)).toBe("15m ago");
  });

  it("returns hours for under a day", () => {
    expect(formatRelativeTime("2026-07-08T09:00:00.000Z", now)).toBe("3h ago");
  });

  it("returns days for a day or more", () => {
    expect(formatRelativeTime("2026-07-06T12:00:00.000Z", now)).toBe("2d ago");
  });
});
