import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime } from "./format-date";

// ISO strings without a trailing Z parse as local time, so day/month/hour don't
// shift by the test runner's timezone — the assertions stay deterministic.
describe("formatDate", () => {
  it("formats a date as dd-mm-yyyy", () => {
    expect(formatDate("2026-07-18T14:30:00")).toBe("18-07-2026");
  });

  it("zero-pads day and month", () => {
    expect(formatDate("2026-03-05T00:00:00")).toBe("05-03-2026");
  });

  it("returns an empty string for an unparseable value", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("not-a-date")).toBe("");
  });
});

describe("formatDateTime", () => {
  it("formats as dd-mm-yyyy, HH:mm in 24-hour time", () => {
    expect(formatDateTime("2026-07-18T09:05:00")).toBe("18-07-2026, 09:05");
    expect(formatDateTime("2026-07-18T23:45:00")).toBe("18-07-2026, 23:45");
  });

  it("returns an empty string for an unparseable value", () => {
    expect(formatDateTime("nope")).toBe("");
  });
});
