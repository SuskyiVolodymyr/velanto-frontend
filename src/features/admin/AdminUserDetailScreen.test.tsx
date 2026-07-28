import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { AdminUserDetailScreen } from "./AdminUserDetailScreen";
import { useAdminUserDetail } from "@/src/features/admin/api/admin.queries";
import { useAuthorBanHistory } from "@/src/features/author/api/author.queries";
import { useAuth } from "@/src/shared/lib/auth-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { rulesClient } from "@/src/shared/lib/rules-client";
import type { AdminUserDetail } from "@/src/shared/types/admin";
import type { RulesDocument } from "@/src/shared/types/rules";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));
// Real `adminUserDetailQueryOptions` is needed too — the moderation hook
// (exercised for real, only its network calls are mocked below) invalidates
// its query key on success.
vi.mock("@/src/features/admin/api/admin.queries", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/src/features/admin/api/admin.queries")
    >();
  return { ...actual, useAdminUserDetail: vi.fn() };
});
vi.mock("@/src/features/author/api/author.queries", () => ({
  useAuthorBanHistory: vi.fn(),
}));
vi.mock("@/src/shared/lib/users-client");
// BanReasonPicker (rendered once the inline ban form opens) fetches the rule
// categories for its own dropdown.
vi.mock("@/src/shared/lib/rules-client", () => ({
  rulesClient: { getRules: vi.fn() },
}));
// The two rails fetch on their own; stub them so this test stays about the
// detail screen's own stats rendering.
vi.mock("@/src/features/author/AuthorPacksRail", () => ({
  AuthorPacksRail: () => null,
}));
vi.mock("@/src/features/author/RecentlyPlayedSection", () => ({
  RecentlyPlayedSection: () => null,
}));

const mockedUsersClient = vi.mocked(usersClient);
const mockedRulesClient = vi.mocked(rulesClient);

const RULES: RulesDocument = {
  version: 1,
  categories: [
    { id: "harassment_bullying", title: "Harassment & Bullying", rules: [] },
  ],
};

const DETAIL: AdminUserDetail = {
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
};

function mockAll(detail: Partial<ReturnType<typeof useAdminUserDetail>> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "admin1", role: "admin" },
    status: "authenticated",
  } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(useAdminUserDetail).mockReturnValue({
    data: DETAIL,
    isLoading: false,
    isError: false,
    ...detail,
  } as unknown as ReturnType<typeof useAdminUserDetail>);
  vi.mocked(useAuthorBanHistory).mockReturnValue({
    data: { items: [], total: 0 },
  } as unknown as ReturnType<typeof useAuthorBanHistory>);
}

describe("AdminUserDetailScreen", () => {
  it("renders the account header and every aggregate stat", () => {
    mockAll();
    render(<AdminUserDetailScreen userId="u1" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "alice",
    );
    expect(screen.getByText(/alice@example\.com/)).toBeInTheDocument();
    // Content, activity, and social numbers all surface (unique values).
    expect(screen.getByText("57")).toBeInTheDocument(); // plays on packs
    expect(screen.getByText("30")).toBeInTheDocument(); // followers
    expect(screen.getByText("12")).toBeInTheDocument(); // packs played
    expect(screen.getByText("9")).toBeInTheDocument(); // likes received
    // The section headings render.
    expect(
      screen.getByRole("heading", { name: "Moderation" }),
    ).toBeInTheDocument();
    // The active status badge shows when the user is not banned.
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows the error state when the detail query fails", () => {
    mockAll({ data: undefined, isError: true });
    render(<AdminUserDetailScreen userId="u1" />);
    expect(screen.getByText("Couldn’t load this user.")).toBeInTheDocument();
  });

  it("keeps both queries disabled until auth resolves (avoids the tokenless-401 race)", () => {
    // While auth is still loading there is no access token yet; firing the
    // admin requests now yields a 401 the api-client won't retry (no token was
    // sent), so the screen must not enable them until authenticated.
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      status: "loading",
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useAdminUserDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useAdminUserDetail>);
    vi.mocked(useAuthorBanHistory).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useAuthorBanHistory>);

    render(<AdminUserDetailScreen userId="u1" />);

    expect(useAdminUserDetail).toHaveBeenCalledWith("u1", { enabled: false });
    expect(useAuthorBanHistory).toHaveBeenCalledWith("u1", { enabled: false });
  });

  it("enables both queries once authenticated as staff", () => {
    mockAll(); // authenticated admin
    render(<AdminUserDetailScreen userId="u1" />);

    expect(useAdminUserDetail).toHaveBeenCalledWith("u1", { enabled: true });
    expect(useAuthorBanHistory).toHaveBeenCalledWith("u1", { enabled: true });
  });

  // #254: what a user is holding right now, beside the budget it is judged
  // against. There is no all-time figure — deleted media leaves no record.
  describe("storage", () => {
    it("shows what the user holds against the budget their trust earns", () => {
      mockAll();
      render(<AdminUserDetailScreen userId="u1" />);

      expect(screen.getByText("500 MB")).toBeInTheDocument();
      expect(screen.getByText("1 GB")).toBeInTheDocument();
    });

    // Staff budgets are unlimited, which the API sends as null rather than a
    // number. Rendering that as "0 B" or blank would read as "no space left".
    it("says unlimited for a staff account rather than showing nothing", () => {
      mockAll({
        data: {
          ...DETAIL,
          role: "moderator",
          storage: { usedBytes: 2048, limitBytes: null },
        },
      });
      render(<AdminUserDetailScreen userId="u1" />);

      expect(screen.getByText("2 KB")).toBeInTheDocument();
      expect(screen.getByText("Unlimited")).toBeInTheDocument();
    });
  });

  // D3: the hero previously had no Trust/Ban actions at all — the real gap
  // this task fills, reusing the same inline duration+reason ban form as the
  // Users tab (UserRow/UserBanForm) and the author page's moderator panel.
  describe("moderation actions", () => {
    it("shows Trust and Ban buttons next to the pill for a user the viewer can act on", () => {
      mockAll();
      render(<AdminUserDetailScreen userId="u1" />);

      expect(screen.getByRole("button", { name: "Trust" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ban" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Unban" }),
      ).not.toBeInTheDocument();
    });

    it("shows Untrust and Unban for a trusted, currently-banned user", () => {
      mockAll({
        data: {
          ...DETAIL,
          trusted: true,
          bannedUntil: "2099-01-01T00:00:00.000Z",
        },
      });
      render(<AdminUserDetailScreen userId="u1" />);

      expect(
        screen.getByRole("button", { name: "Untrust" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Unban" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Ban" }),
      ).not.toBeInTheDocument();
    });

    it("hides trust/ban actions when the viewer can't act on the target (equal-or-higher rank)", () => {
      mockAll({ data: { ...DETAIL, role: "admin" } });
      render(<AdminUserDetailScreen userId="u1" />);

      expect(
        screen.queryByRole("button", { name: "Trust" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Ban" }),
      ).not.toBeInTheDocument();
    });

    it("trusts the user on click", async () => {
      mockAll();
      mockedUsersClient.setTrusted.mockResolvedValue({
        id: "u1",
        trusted: true,
      });
      const user = userEvent.setup();
      render(<AdminUserDetailScreen userId="u1" />);

      await user.click(screen.getByRole("button", { name: "Trust" }));

      await waitFor(() =>
        expect(mockedUsersClient.setTrusted).toHaveBeenCalledWith("u1", true),
      );
    });

    it("surfaces a localized error when trust fails", async () => {
      mockAll();
      mockedUsersClient.setTrusted.mockRejectedValue(new Error("boom"));
      const user = userEvent.setup();
      render(<AdminUserDetailScreen userId="u1" />);

      await user.click(screen.getByRole("button", { name: "Trust" }));

      expect(
        await screen.findByText("Couldn't trust this user. Try again."),
      ).toBeInTheDocument();
    });

    it("unbans the user on click", async () => {
      mockAll({ data: { ...DETAIL, bannedUntil: "2099-01-01T00:00:00.000Z" } });
      mockedUsersClient.unban.mockResolvedValue({
        id: "u1",
        bannedUntil: null,
      });
      const user = userEvent.setup();
      render(<AdminUserDetailScreen userId="u1" />);

      await user.click(screen.getByRole("button", { name: "Unban" }));

      await waitFor(() =>
        expect(mockedUsersClient.unban).toHaveBeenCalledWith("u1"),
      );
    });

    it("opens the inline ban form on Ban, and Cancel closes it again", async () => {
      mockAll();
      mockedRulesClient.getRules.mockResolvedValue(RULES);
      const user = userEvent.setup();
      render(<AdminUserDetailScreen userId="u1" />);

      await user.click(screen.getByRole("button", { name: "Ban" }));
      expect(screen.getByLabelText("Duration")).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByLabelText("Reason")).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByLabelText("Duration")).not.toBeInTheDocument();
    });

    it("submits a ban with the chosen duration and reason", async () => {
      mockAll();
      mockedRulesClient.getRules.mockResolvedValue(RULES);
      mockedUsersClient.ban.mockResolvedValue({
        id: "u1",
        bannedUntil: "2026-08-04T00:00:00.000Z",
      });
      const user = userEvent.setup();
      render(<AdminUserDetailScreen userId="u1" />);

      await user.click(screen.getByRole("button", { name: "Ban" }));
      await waitFor(() =>
        expect(screen.getByLabelText("Reason")).toBeInTheDocument(),
      );

      const confirmButton = screen.getByRole("button", { name: "Confirm ban" });
      expect(confirmButton).toBeDisabled();

      await user.selectOptions(screen.getByLabelText("Ban duration"), "month");
      await user.selectOptions(
        screen.getByLabelText("Reason"),
        "harassment_bullying",
      );

      expect(confirmButton).not.toBeDisabled();
      await user.click(confirmButton);

      await waitFor(() =>
        expect(mockedUsersClient.ban).toHaveBeenCalledWith("u1", {
          duration: "month",
          reason: "harassment_bullying",
        }),
      );
    });

    it("surfaces a localized error when the ban request fails", async () => {
      mockAll();
      mockedRulesClient.getRules.mockResolvedValue(RULES);
      mockedUsersClient.ban.mockRejectedValue(new Error("boom"));
      const user = userEvent.setup();
      render(<AdminUserDetailScreen userId="u1" />);

      await user.click(screen.getByRole("button", { name: "Ban" }));
      await waitFor(() =>
        expect(screen.getByLabelText("Reason")).toBeInTheDocument(),
      );
      await user.selectOptions(
        screen.getByLabelText("Reason"),
        "harassment_bullying",
      );
      await user.click(screen.getByRole("button", { name: "Confirm ban" }));

      expect(
        await screen.findByText("Couldn't ban this user. Try again."),
      ).toBeInTheDocument();
    });
  });
});
