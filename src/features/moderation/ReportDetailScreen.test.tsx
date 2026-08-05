import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pickFromDropdown } from "@/src/shared/test/pick-from-dropdown";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { ReportDetailScreen } from "./ReportDetailScreen";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { usersClient } from "@/src/shared/lib/users-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import { rulesClient } from "@/src/shared/lib/rules-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { RulesDocument } from "@/src/shared/types/rules";
import type { Pack } from "@/src/shared/types/pack";
import type { AdminUserDetail } from "@/src/shared/types/admin";

vi.mock("@/src/shared/lib/reports-client");
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/users-client");
vi.mock("@/src/shared/lib/admin-client");
vi.mock("@/src/shared/lib/rules-client", () => ({
  rulesClient: { getRules: vi.fn() },
}));
vi.mock("@/src/shared/lib/auth-context");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/support/r1",
}));

const mockedReportsClient = vi.mocked(reportsClient);
const mockedPacksClient = vi.mocked(packsClient);
const mockedUsersClient = vi.mocked(usersClient);
const mockedAdminClient = vi.mocked(adminClient);
const mockedRulesClient = vi.mocked(rulesClient);
const mockedUseAuth = vi.mocked(useAuth);

const RULES: RulesDocument = {
  version: 1,
  categories: [
    { id: "harassment_bullying", title: "Harassment & Bullying", rules: [] },
    { id: "spam_manipulation", title: "Spam & Manipulation", rules: [] },
  ],
};

// The BanReasonPicker uses next-intl + React Query, so the ban flow needs both.
function renderScreen(ui: ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const packReport = {
  id: "r1",
  type: "pack" as const,
  reason: "spam",
  comment: "looks fake",
  targetId: "pack-1",
  targetLabel: "Best Anime Openings",
  roundIndex: null,
  reporterId: "u1",
  reporterUsername: "reporter1",
  status: "new" as const,
  reviewedById: null,
  closedById: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const userReport = {
  ...packReport,
  id: "r2",
  type: "user" as const,
  targetId: "user-1",
  targetLabel: "suspect",
  reason: "harassment",
};

const roundReport = {
  ...packReport,
  id: "r3",
  type: "round" as const,
  targetId: "pack-1",
  roundIndex: 1,
  reason: "spam",
};

function reportedPack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: "pack-1",
    title: "Reported Pack",
    description: "",
    coverTone: "#2b2a3a",
    format: "save_one",
    language: "en",
    tags: [],
    groups: [
      {
        id: "g1",
        name: "Pool A",
        items: [{ id: "i1", type: "text", title: "Item A1", value: "Item A1" }],
      },
      {
        id: "g2",
        name: "Pool B",
        items: [{ id: "i2", type: "text", title: "Item B1", value: "Item B1" }],
      },
    ],
    rounds: [
      {
        id: "rnd1",
        name: "",
        slots: [{ groupId: "g1", mode: "manual", itemIds: ["i1"] }],
      },
      {
        id: "rnd2",
        name: "",
        slots: [{ groupId: "g2", mode: "manual", itemIds: ["i2"] }],
      },
    ],
    authorId: "a1",
    author: {
      id: "a1",
      username: "author1",
      avatarKey: null,
      role: "user",
      trusted: false,
    },
    createdAt: "2020-01-01T00:00:00.000Z",
    submittedAt: "2026-01-01T00:00:00.000Z",
    totalPlays: 0,
    avgAgreementPercent: 0,
    status: "approved",
    rejectionReason: null,
    score: 0,
    likes: 0,
    dislikes: 0,
    myVote: null,
    ...overrides,
  };
}

function reportedUser(
  overrides: Partial<AdminUserDetail> = {},
): AdminUserDetail {
  return {
    id: "user-1",
    username: "reporteduser",
    email: "u@example.com",
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
    moderation: { reportsAgainst: 6, reportsFiled: 1 },
    storage: { usedBytes: 500 * 1024 * 1024, limitBytes: 1024 * 1024 * 1024 },
    ...overrides,
  };
}

function mockAuth(role: "moderator" | "manager" | "admin" = "moderator") {
  mockedUseAuth.mockReturnValue({
    user: {
      id: "mod-1",
      email: "m@x.com",
      username: "mod",
      role,
      createdAt: "",
    },
    status: "authenticated",
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAvatarKey: vi.fn(),
    patchUser: vi.fn(),
    revalidate: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("ReportDetailScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedRulesClient.getRules.mockResolvedValue(RULES);
    // Default resolutions for the T7 content-preview fetches so tests that
    // don't care about them (most of the pre-existing suite) aren't broken
    // by the new, additive queries firing underneath. Tests that DO care
    // override these per-case.
    mockedPacksClient.getById.mockResolvedValue(reportedPack());
    mockedAdminClient.userDetail.mockResolvedValue(reportedUser());
    // Same for the target's report history: additive, fires on every render.
    mockedReportsClient.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  it("shows a not-found message when the report doesn't exist", async () => {
    mockAuth();
    mockedReportsClient.getById.mockRejectedValue(new Error("404"));
    renderScreen(<ReportDetailScreen reportId="missing" />);
    await waitFor(() =>
      expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument(),
    );
  });

  it("shows Review for a new report and calls review() on click", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedReportsClient.review.mockResolvedValue({
      ...packReport,
      status: "reviewing",
    });
    renderScreen(<ReportDetailScreen reportId="r1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Review" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await waitFor(() =>
      expect(mockedReportsClient.review).toHaveBeenCalledWith("r1"),
    );
  });

  it("shows Mark resolved for a new report (no review required first) and calls close()", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedReportsClient.close.mockResolvedValue({
      ...packReport,
      status: "closed",
    });
    renderScreen(<ReportDetailScreen reportId="r1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /mark resolved/i }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /mark resolved/i }),
    );
    await waitFor(() =>
      expect(mockedReportsClient.close).toHaveBeenCalledWith("r1"),
    );
  });

  it("hides both queue-action buttons once a report is closed", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue({
      ...packReport,
      status: "closed",
    });
    renderScreen(<ReportDetailScreen reportId="r1" />);
    await waitFor(() =>
      expect(screen.getByText("looks fake")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /mark resolved/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a Delete pack button for a pack-type report and calls packsClient.delete()", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedPacksClient.delete.mockResolvedValue({ deleted: true });
    renderScreen(<ReportDetailScreen reportId="r1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /delete pack/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /^ban user$/i }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /delete pack/i }));
    await waitFor(() =>
      expect(mockedPacksClient.delete).toHaveBeenCalledWith("pack-1"),
    );
    await waitFor(() =>
      expect(screen.getByText(/pack deleted/i)).toBeInTheDocument(),
    );
  });

  it("shows Mark resolved but not Review for a reviewing report", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue({
      ...packReport,
      status: "reviewing",
    });
    renderScreen(<ReportDetailScreen reportId="r1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /mark resolved/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Review" }),
    ).not.toBeInTheDocument();
  });

  it("shows a Ban user button and inline ban form for a user-type report", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(userReport);
    mockedUsersClient.ban.mockResolvedValue({
      id: "user-1",
      bannedUntil: "2027-01-01T00:00:00.000Z",
    });
    renderScreen(<ReportDetailScreen reportId="r2" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^ban user$/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /delete pack/i }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^ban user$/i }));
    await pickFromDropdown(userEvent, "Reason", "Harassment & Bullying");
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));
    await waitFor(() =>
      expect(mockedUsersClient.ban).toHaveBeenCalledWith("user-1", {
        duration: "week",
        reason: "harassment_bullying",
      }),
    );
  });

  it("shows an inline error and does not clear state when review() fails", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedReportsClient.review.mockRejectedValue(new Error("network"));
    renderScreen(<ReportDetailScreen reportId="r1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Review" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await waitFor(() =>
      expect(screen.getByText(/couldn't/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
  });

  it("shows an inline error next to Delete pack (not the queue actions) when packsClient.delete() fails, and the button stays clickable", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedPacksClient.delete.mockRejectedValue(new Error("network"));
    renderScreen(<ReportDetailScreen reportId="r1" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /delete pack/i }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /delete pack/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't delete this pack/i),
      ).toBeInTheDocument(),
    );
    const deleteButton = screen.getByRole("button", { name: /delete pack/i });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).not.toBeDisabled();
    // The error must render alongside Delete pack, not near the queue-action buttons.
    expect(screen.getByText(/couldn't delete this pack/i).parentElement).toBe(
      deleteButton.parentElement,
    );
  });

  it("shows an inline error and keeps the ban form open when usersClient.ban() fails", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(userReport);
    mockedUsersClient.ban.mockRejectedValue(new Error("network"));
    renderScreen(<ReportDetailScreen reportId="r2" />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^ban user$/i }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /^ban user$/i }));
    await pickFromDropdown(userEvent, "Reason", "Harassment & Bullying");
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));
    await waitFor(() =>
      expect(screen.getByText(/couldn't ban this user/i)).toBeInTheDocument(),
    );
    // The form stays open (the reason picker is still on screen).
    expect(screen.getByLabelText("Reason")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm ban/i }),
    ).toBeInTheDocument();
  });

  it("fetches and renders the full pack contents inline for a pack-type report (T7/D8)", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedPacksClient.getById.mockResolvedValue(reportedPack());
    renderScreen(<ReportDetailScreen reportId="r1" />);

    expect(await screen.findByText("Pool A")).toBeInTheDocument();
    expect(screen.getByText("Item A1")).toBeInTheDocument();
    // No roundIndex for a pack report — every pool renders.
    expect(screen.getByText("Pool B")).toBeInTheDocument();
    expect(screen.getByText("Item B1")).toBeInTheDocument();
    expect(mockedPacksClient.getById).toHaveBeenCalledWith("pack-1");
  });

  it("fetches the target pack and narrows to one round's slots for a round-type report (T7/D8)", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(roundReport);
    mockedPacksClient.getById.mockResolvedValue(reportedPack());
    renderScreen(<ReportDetailScreen reportId="r3" />);

    // roundIndex: 1 -> round "rnd2" -> slot draws from Pool B only.
    expect(await screen.findByText("Pool B")).toBeInTheDocument();
    expect(screen.getByText("Item B1")).toBeInTheDocument();
    expect(screen.queryByText("Pool A")).not.toBeInTheDocument();
    expect(screen.queryByText("Item A1")).not.toBeInTheDocument();
    // A round report's targetId IS the pack id — same fetch as a pack report.
    expect(mockedPacksClient.getById).toHaveBeenCalledWith("pack-1");
  });

  it("fetches and renders a compact account summary for a user-type report, for a manager/admin viewer (T7/D8)", async () => {
    // adminClient.userDetail (GET /admin/users/:id) is manager/admin-only
    // server-side — this component's own manager/admin gate, not the
    // moderator+ gate ReportDetailScreen itself uses.
    for (const role of ["manager", "admin"] as const) {
      mockAuth(role);
      mockedReportsClient.getById.mockResolvedValue(userReport);
      mockedAdminClient.userDetail.mockResolvedValue(reportedUser());
      const { unmount } = renderScreen(<ReportDetailScreen reportId="r2" />);

      expect(await screen.findByText("reporteduser")).toBeInTheDocument();
      expect(screen.getByText(/joined 01-01-2026/i)).toBeInTheDocument();
      // Aggregate moderation counts (D9) — not an itemized list.
      expect(screen.getByText("6")).toBeInTheDocument();
      expect(mockedAdminClient.userDetail).toHaveBeenCalledWith("user-1");
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
      unmount();
    }
  });

  it("does not fetch the target pack or user for a user-type or pack-type report respectively", async () => {
    mockAuth("admin");
    mockedReportsClient.getById.mockResolvedValue(userReport);
    mockedAdminClient.userDetail.mockResolvedValue(reportedUser());
    renderScreen(<ReportDetailScreen reportId="r2" />);

    await screen.findByText("reporteduser");
    expect(mockedPacksClient.getById).not.toHaveBeenCalled();
  });

  it("does not call adminClient.userDetail for a moderator viewer on a user-type report — that endpoint is manager/admin-only server-side", async () => {
    mockAuth("moderator");
    mockedReportsClient.getById.mockResolvedValue(userReport);
    renderScreen(<ReportDetailScreen reportId="r2" />);

    expect(
      await screen.findByText(
        "Only managers and admins can view reported account details.",
      ),
    ).toBeInTheDocument();
    expect(mockedAdminClient.userDetail).not.toHaveBeenCalled();
    expect(screen.queryByText("reporteduser")).not.toBeInTheDocument();
  });

  it("keeps the summary and queue actions rendering while the content preview is still loading", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    // Never resolves within this test — simulates an in-flight fetch.
    mockedPacksClient.getById.mockReturnValue(new Promise(() => {}));
    renderScreen(<ReportDetailScreen reportId="r1" />);

    expect(await screen.findByText("looks fake")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
  });

  it("shows an inline error for the content preview without blocking the rest of the screen when the target pack fetch fails", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedPacksClient.getById.mockRejectedValue(new Error("network"));
    renderScreen(<ReportDetailScreen reportId="r1" />);

    expect(await screen.findByText("looks fake")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
    expect(
      await screen.findByText(/couldn't load this report's content/i),
    ).toBeInTheDocument();
  });

  describe("other reports about the same target", () => {
    it("lists them, keyed on the target rather than the report", async () => {
      mockAuth("moderator");
      mockedReportsClient.getById.mockResolvedValue(userReport);
      mockedReportsClient.list.mockResolvedValue({
        items: [
          userReport,
          { ...userReport, id: "r9", reason: "spam", reporterUsername: "mia" },
        ],
        total: 2,
        page: 1,
        limit: 10,
      });
      renderScreen(<ReportDetailScreen reportId="r2" />);

      expect(await screen.findByText("Spam or scam")).toBeInTheDocument();
      expect(screen.getByText("by mia")).toBeInTheDocument();
      expect(mockedReportsClient.list).toHaveBeenCalledWith(
        expect.objectContaining({ targetId: "user-1" }),
      );
    });

    // The endpoint has no "exclude" parameter, so the report being viewed comes
    // back in its own history — listing it again would read as a second report.
    it("drops the report being viewed from its own history", async () => {
      mockAuth("moderator");
      mockedReportsClient.getById.mockResolvedValue(userReport);
      mockedReportsClient.list.mockResolvedValue({
        items: [userReport],
        total: 1,
        page: 1,
        limit: 10,
      });
      renderScreen(<ReportDetailScreen reportId="r2" />);

      expect(
        await screen.findByText("No other reports about this target."),
      ).toBeInTheDocument();
    });

    it("is available to a plain moderator, unlike the account summary", async () => {
      mockAuth("moderator");
      mockedReportsClient.getById.mockResolvedValue(userReport);
      mockedReportsClient.list.mockResolvedValue({
        items: [
          userReport,
          { ...userReport, id: "r9", reason: "spam", reporterUsername: "mia" },
        ],
        total: 2,
        page: 1,
        limit: 10,
      });
      renderScreen(<ReportDetailScreen reportId="r2" />);

      expect(await screen.findByText("by mia")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Only managers and admins can view reported account details.",
        ),
      ).toBeInTheDocument();
    });

    it("says how many are hidden when the target has more than one page of history", async () => {
      mockAuth("moderator");
      mockedReportsClient.getById.mockResolvedValue(userReport);
      mockedReportsClient.list.mockResolvedValue({
        items: [
          { ...userReport, id: "r9", reason: "spam", reporterUsername: "mia" },
        ],
        total: 31,
        page: 1,
        limit: 10,
      });
      renderScreen(<ReportDetailScreen reportId="r2" />);

      expect(
        await screen.findByText("Showing 1 of 30 other reports."),
      ).toBeInTheDocument();
    });
  });
});
