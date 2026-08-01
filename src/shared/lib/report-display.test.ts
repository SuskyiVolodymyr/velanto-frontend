import { describe, expect, it } from "vitest";
import { reportTargetLabel } from "./report-display";
import type { ReportWithReporter } from "@/src/shared/types/report";

function report(
  overrides: Partial<ReportWithReporter> = {},
): ReportWithReporter {
  return {
    id: "r1",
    type: "pack",
    reason: "spam",
    comment: null,
    targetId: "pack-abcdef1234",
    targetLabel: "Best Anime Openings",
    roundIndex: null,
    reporterId: "u1",
    reporterUsername: "watchdog",
    status: "new",
    reviewedById: null,
    closedById: null,
    createdAt: "2026-07-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("reportTargetLabel", () => {
  it("names a reported pack and links to it", () => {
    expect(reportTargetLabel(report())).toEqual({
      text: "Best Anime Openings",
      href: "/packs/pack-abcdef1234",
    });
  });

  it("names a reported account with its @handle, linking to the profile", () => {
    expect(
      reportTargetLabel(
        report({ type: "user", targetId: "user-1", targetLabel: "suspect" }),
      ),
    ).toEqual({ text: "@suspect", href: "/users/user-1" });
  });

  it("numbers a round from 1 and names its pack", () => {
    expect(
      reportTargetLabel(report({ type: "round", roundIndex: 2 })).text,
    ).toBe("Round 3 of Best Anime Openings");
  });

  // targetLabel is null only for a target that has since been deleted. The id
  // is unusable as a name, but it is all that is left to identify the row by.
  it("falls back to the truncated id when the target is gone", () => {
    expect(
      reportTargetLabel(report({ type: "user", targetLabel: null })).text,
    ).toBe("User pack-abc");
    expect(reportTargetLabel(report({ targetLabel: null })).text).toBe(
      "pack pack-abc",
    );
    expect(
      reportTargetLabel(
        report({ type: "round", roundIndex: 0, targetLabel: null }),
      ).text,
    ).toBe("Round 1 of pack pack-abc");
  });
});
