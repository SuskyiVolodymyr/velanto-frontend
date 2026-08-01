import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ReportedUserSummary } from "./ReportedUserSummary";
import type { AdminUserDetail } from "@/src/shared/types/admin";

function userDetail(overrides: Partial<AdminUserDetail> = {}): AdminUserDetail {
  return {
    id: "u1",
    username: "alice",
    email: "alice@example.com",
    role: "user",
    trusted: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    bannedUntil: null,
    banReason: null,
    content: {
      packsTotal: 3,
      packsApproved: 2,
      packsPending: 1,
      packsRejected: 0,
      totalPlaysOnPacks: 57,
      likesOnPacks: 9,
    },
    activity: { commentsCount: 4, playsRecorded: 12 },
    social: { followers: 30, following: 5 },
    moderation: { reportsAgainst: 2, reportsFiled: 1 },
    storage: { usedBytes: 500 * 1024 * 1024, limitBytes: 1024 * 1024 * 1024 },
    ...overrides,
  };
}

describe("ReportedUserSummary", () => {
  it("renders the username, joined date, and packs/comments counts", () => {
    render(<ReportedUserSummary user={userDetail()} />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText(/01-01-2026/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders the moderation.reportsAgainst/reportsFiled aggregate counts (D9)", () => {
    render(
      <ReportedUserSummary
        user={userDetail({
          moderation: { reportsAgainst: 5, reportsFiled: 2 },
        })}
      />,
    );

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("never renders an itemized list of reports against the account (D9 — hard cut)", () => {
    render(<ReportedUserSummary user={userDetail()} />);

    // No list/table markup for individual report rows — only the aggregate
    // counts. There is nothing to itemize against, so no listitem/row roles.
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryAllByRole("row")).toHaveLength(0);
  });

  it("shows the staff role badge for a staff account", () => {
    render(
      <ReportedUserSummary
        user={userDetail({ username: "modbot", role: "moderator" })}
      />,
    );

    expect(screen.getByText("modbot")).toBeInTheDocument();
    expect(screen.getByText(/moderator/i)).toBeInTheDocument();
  });
});
