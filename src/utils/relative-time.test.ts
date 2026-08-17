import { describe, it, expect } from "vitest";
import { formatRelativeTime, formatRelativeTimeIntl } from "./relative-time";

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");

  it("returns 'just now' for under a minute", () => {
    expect(formatRelativeTime("2026-07-08T11:59:30.000Z", now)).toBe(
      "just now",
    );
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

describe("formatRelativeTimeIntl", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");
  const en = (iso: string) => formatRelativeTimeIntl(iso, "en", now);

  it("spells out each unit up to days", () => {
    expect(en("2026-07-08T11:59:30.000Z")).toBe("now");
    expect(en("2026-07-08T11:58:00.000Z")).toBe("2 minutes ago");
    expect(en("2026-07-08T09:00:00.000Z")).toBe("3 hours ago");
    expect(en("2026-07-06T12:00:00.000Z")).toBe("2 days ago");
  });

  // Capped at days on purpose — a months/years escalation was explicitly not
  // wanted, so a long-dormant pack still reads in days.
  it("never escalates past days", () => {
    expect(en("2026-03-10T12:00:00.000Z")).toBe("120 days ago");
  });

  it("localizes the label to the active locale", () => {
    expect(formatRelativeTimeIntl("2026-03-10T12:00:00.000Z", "uk", now)).toBe(
      "120 днів тому",
    );
  });

  // `numeric: "auto"` prefers the idiomatic word where a locale has one, e.g.
  // uk renders "2 days ago" as "позавчора" rather than counting.
  it("prefers a locale's idiomatic wording over a bare count", () => {
    expect(formatRelativeTimeIntl("2026-07-06T12:00:00.000Z", "uk", now)).toBe(
      "позавчора",
    );
  });
});
