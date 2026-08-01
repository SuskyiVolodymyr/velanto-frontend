import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { AuthorPackList } from "./AuthorPackList";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: { list: vi.fn() },
}));

// useAuthorPacks now reads auth (to refetch as the viewer on sign-in); a stable
// signed-out session keeps these list-rendering tests focused and refetch-free.
// The same signed-out `user: null` also satisfies each rendered PackCard's own
// useAuth() call for its Friends button.
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ status: "unauthenticated", user: null }),
}));

// PackCard's Friends button needs a mounted router + the room-create client —
// unused by these list-rendering tests, but required for PackCard to mount.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/src/features/friends-rooms/friends-rooms-client", () => ({
  friendsRoomsClient: { create: vi.fn() },
}));

function pack(
  id: string,
  title: string,
  status: Pack["status"] = "approved",
): Pack {
  return {
    id,
    title,
    description: "d",
    coverTone: "#111",
    language: "en",
    format: "save_one",
    tags: [],
    groups: [],
    rounds: [],
    authorId: "author-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    totalPlays: 0,
    avgAgreementPercent: 0,
    status,
    rejectionReason: null,
    score: 0,
    likes: 0,
    dislikes: 0,
    myVote: null,
  };
}

const SEED_SIX = Array.from({ length: 6 }, (_, i) =>
  pack(`p${i + 1}`, `Pack ${i + 1}`),
);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: the mount refetch (staleTime 0) re-serves the same first page, so
  // seeded content stays put. Tests that page further override per page below.
  vi.mocked(packsClient.list).mockResolvedValue({
    items: SEED_SIX,
    total: 6,
    page: 1,
    limit: 6,
  });
});

describe("AuthorPackList", () => {
  it("paints the seeded packs immediately", () => {
    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={SEED_SIX}
        initialTotal={6}
      />,
    );
    // Seeded, so the packs are on screen synchronously — no loading wait.
    expect(screen.getByText("Pack 1")).toBeInTheDocument();
    expect(screen.getByText("Pack 6")).toBeInTheDocument();
  });

  it("hides Load more when the first page already holds every pack", () => {
    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={SEED_SIX}
        initialTotal={6}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /load more/i }),
    ).not.toBeInTheDocument();
  });

  it("appends the next page of packs when Load more is clicked", async () => {
    const user = userEvent.setup();
    // The mount refetch re-serves page 1 (total 8 so the button stays); Load
    // more fetches page 2.
    vi.mocked(packsClient.list).mockImplementation((filters) =>
      Promise.resolve(
        filters?.page === 2
          ? {
              items: [pack("p7", "Pack 7"), pack("p8", "Pack 8")],
              total: 8,
              page: 2,
              limit: 6,
            }
          : { items: SEED_SIX, total: 8, page: 1, limit: 6 },
      ),
    );
    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={SEED_SIX}
        initialTotal={8}
      />,
    );
    await screen.findByText("Pack 1");

    await user.click(screen.getByRole("button", { name: /load more/i }));

    expect(await screen.findByText("Pack 7")).toBeInTheDocument();
    expect(screen.getByText("Pack 8")).toBeInTheDocument();
    expect(packsClient.list).toHaveBeenCalledWith({
      authorId: "author-1",
      page: 2,
      limit: 6,
    });
    // All eight now shown → the button is gone.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /load more/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows the empty state for an author with no packs", async () => {
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 6,
    });
    const { unmount } = render(
      <AuthorPackList authorId="author-1" initialPacks={[]} initialTotal={0} />,
    );
    expect(await screen.findByText(/no packs yet/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /load more/i }),
    ).not.toBeInTheDocument();
    unmount();

    // The own-profile variant uses its own, more inviting empty copy.
    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={[]}
        initialTotal={0}
        own
      />,
    );
    expect(
      await screen.findByText(/create your first one/i),
    ).toBeInTheDocument();
  });

  it("shows status badges only in the own-profile variant", async () => {
    const mine = pack("p1", "Mine", "pending");
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [mine],
      total: 1,
      page: 1,
      limit: 6,
    });
    const { unmount } = render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={[mine]}
        initialTotal={1}
        own
      />,
    );
    // Own profile now also renders a "Pending review" filter chip (a
    // <button>), so disambiguate from the pack card's status badge (a
    // <span>) by element type.
    expect(
      await screen.findByText("Pending review", { selector: "span" }),
    ).toBeInTheDocument();
    unmount();

    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={[pack("p1", "Theirs", "pending")]}
        initialTotal={1}
      />,
    );
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  });

  it("does not render a section heading (redundant with the ProfileTabs Packs tab)", () => {
    render(
      <AuthorPackList
        authorId="author-1"
        initialPacks={SEED_SIX}
        initialTotal={6}
        own
      />,
    );
    expect(
      screen.queryByRole("heading", { name: /my packs|^packs$/i }),
    ).not.toBeInTheDocument();
  });

  describe("status filter chips (own profile only)", () => {
    it("renders All + one chip per PACK_STATUSES value for the owner", () => {
      render(
        <AuthorPackList
          authorId="author-1"
          initialPacks={SEED_SIX}
          initialTotal={6}
          own
        />,
      );
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Draft" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pending review" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Approved" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Rejected" }),
      ).toBeInTheDocument();
    });

    it("does not render the filter chip row for a visitor", () => {
      render(
        <AuthorPackList
          authorId="author-1"
          initialPacks={SEED_SIX}
          initialTotal={6}
        />,
      );
      expect(
        screen.queryByRole("button", { name: "All" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Approved" }),
      ).not.toBeInTheDocument();
    });

    it("filters the visible packs client-side without refetching", async () => {
      const user = userEvent.setup();
      const mixed = [
        pack("p1", "Draft Pack", "draft"),
        pack("p2", "Approved Pack", "approved"),
        pack("p3", "Pending Pack", "pending"),
      ];
      vi.mocked(packsClient.list).mockResolvedValue({
        items: mixed,
        total: 3,
        page: 1,
        limit: 6,
      });
      render(
        <AuthorPackList
          authorId="author-1"
          initialPacks={mixed}
          initialTotal={3}
          own
        />,
      );
      await screen.findByText("Draft Pack");
      const callsBeforeFilter = vi.mocked(packsClient.list).mock.calls.length;

      await user.click(screen.getByRole("button", { name: "Draft" }));

      expect(screen.getByText("Draft Pack")).toBeInTheDocument();
      expect(screen.queryByText("Approved Pack")).not.toBeInTheDocument();
      expect(screen.queryByText("Pending Pack")).not.toBeInTheDocument();
      // Purely a local .filter() over already-loaded packs (D13) — no new fetch.
      expect(vi.mocked(packsClient.list).mock.calls.length).toBe(
        callsBeforeFilter,
      );
    });

    it("shows every pack again after switching back to All", async () => {
      const user = userEvent.setup();
      const mixed = [
        pack("p1", "Draft Pack", "draft"),
        pack("p2", "Approved Pack", "approved"),
      ];
      vi.mocked(packsClient.list).mockResolvedValue({
        items: mixed,
        total: 2,
        page: 1,
        limit: 6,
      });
      render(
        <AuthorPackList
          authorId="author-1"
          initialPacks={mixed}
          initialTotal={2}
          own
        />,
      );
      await screen.findByText("Draft Pack");

      await user.click(screen.getByRole("button", { name: "Draft" }));
      expect(screen.queryByText("Approved Pack")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "All" }));
      expect(screen.getByText("Draft Pack")).toBeInTheDocument();
      expect(screen.getByText("Approved Pack")).toBeInTheDocument();
    });

    it("keeps Load more calling the real, unfiltered next page while a filter is active", async () => {
      const user = userEvent.setup();
      // First page is all "draft" (6 = AUTHOR_PACKS_PAGE_SIZE, matching the
      // existing "appends the next page" test's shape) so filtering to
      // "approved" hides everything until page 2 loads.
      const draftPage = Array.from({ length: 6 }, (_, i) =>
        pack(`p${i + 1}`, `Draft ${i + 1}`, "draft"),
      );
      vi.mocked(packsClient.list).mockImplementation((filters) =>
        Promise.resolve(
          filters?.page === 2
            ? {
                items: [pack("p7", "Page Two Approved", "approved")],
                total: 7,
                page: 2,
                limit: 6,
              }
            : { items: draftPage, total: 7, page: 1, limit: 6 },
        ),
      );
      render(
        <AuthorPackList
          authorId="author-1"
          initialPacks={draftPage}
          initialTotal={7}
          own
        />,
      );
      await screen.findByText("Draft 1");

      // Filter down to "approved" first — nothing on page 1 matches.
      await user.click(screen.getByRole("button", { name: "Approved" }));
      expect(screen.queryByText("Draft 1")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /load more/i }));

      // Load more fetched page 2 of the UNFILTERED query (no status param).
      expect(packsClient.list).toHaveBeenCalledWith({
        authorId: "author-1",
        page: 2,
        limit: 6,
      });
      // The newly-loaded approved pack from page 2 now shows through the filter.
      expect(await screen.findByText("Page Two Approved")).toBeInTheDocument();
    });
  });
});
