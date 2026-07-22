import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { AdminUserDetailScreen } from "./AdminUserDetailScreen";
import { useAdminUserDetail } from "@/src/features/admin/api/admin.queries";
import { useAuthorBanHistory } from "@/src/features/author/api/author.queries";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { AdminUserDetail } from "@/src/shared/types/admin";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/src/features/admin/api/admin.queries", () => ({
  useAdminUserDetail: vi.fn(),
}));
vi.mock("@/src/features/author/api/author.queries", () => ({
  useAuthorBanHistory: vi.fn(),
}));
// The two rails fetch on their own; stub them so this test stays about the
// detail screen's own stats rendering.
vi.mock("@/src/features/author/AuthorPacksRail", () => ({
  AuthorPacksRail: () => null,
}));
vi.mock("@/src/features/author/RecentlyPlayedSection", () => ({
  RecentlyPlayedSection: () => null,
}));

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
});
