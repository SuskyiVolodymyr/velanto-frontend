import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { HomeFeed } from "./HomeFeed";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: {
    create: vi.fn(),
    getById: vi.fn(),
    list: vi.fn(),
  },
}));

// Each rendered PackCard's Friends button needs a mounted router, an auth
// session, and the room-create client — signed-out by default so the button
// renders blocked; unused by these feed-behaviour tests otherwise.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock("@/src/features/friends-rooms/friends-rooms-client", () => ({
  friendsRoomsClient: { create: vi.fn() },
}));

const PACK_A: Pack = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  language: "en",
  tags: ["Anime", "Music"],
  groups: [{ id: "g1", name: "2016", items: [] }],
  rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "manual" }] }],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

// Tags, language and sort each have their own named trigger in the row now —
// there is no longer a shared "Filters" popover to open first. Tags goes
// straight to the picker modal; language is the app's Dropdown (button +
// listbox, so not `selectOptions`); sort keeps its popover.
function tagsTrigger() {
  return screen.getByRole("button", { name: /^Tags/ });
}
function openTags(user: ReturnType<typeof userEvent.setup>) {
  return user.click(tagsTrigger());
}
async function pickLanguage(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(
    screen.getByRole("combobox", { name: /filter by language/i }),
  );
  await user.click(screen.getByRole("option", { name: label }));
}
function openSort(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: /sort by/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // The feed now persists filters to localStorage; clear it so each test starts
  // from a clean slate and stored state never leaks between cases.
  localStorage.clear();
});

describe("HomeFeed", () => {
  it("fetches with no filters on mount and renders the results", async () => {
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [PACK_A],
      total: 1,
      page: 1,
      limit: 25,
    });
    render(<HomeFeed />);

    expect(await screen.findByText("Best Anime Openings")).toBeInTheDocument();
    expect(packsClient.list).toHaveBeenCalledWith({
      format: undefined,
      tags: [],
      languages: [],
      sort: "popular",
      window: "month",
      limit: 25,
    });
  });

  it("still fetches on mount when seeded from the server, so a stale SSR feed is never what the visitor ends up looking at", async () => {
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [PACK_A],
      total: 1,
      page: 1,
      limit: 25,
    });

    // The seed the home route passes down. It comes out of Next's Data Cache
    // and can be up to six hours old (see get-home-feed-server.ts), so it must
    // arrive already stale rather than fresh-as-of-now — otherwise `staleTime`
    // suppresses this refetch and a visitor is served the cached copy with no
    // way to ever see a newer pack. A trusted author publishing and reloading
    // is the case that breaks first.
    render(<HomeFeed initialFeed={{ items: [], total: 0 }} />);

    expect(await screen.findByText("Best Anime Openings")).toBeInTheDocument();
    expect(packsClient.list).toHaveBeenCalled();
  });

  it("shows the empty state when no packs match", async () => {
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    });
    render(<HomeFeed />);

    expect(
      await screen.findByText("No packs match these filters yet."),
    ).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(packsClient.list).mockRejectedValue(new Error("network error"));
    render(<HomeFeed />);

    expect(
      await screen.findByText("Couldn't load packs. Try again later."),
    ).toBeInTheDocument();
  });

  // Regression test for the bug the browser caught and the unit tests didn't:
  // `languages` reached the QUERY KEY (so a refetch fired) but not the request,
  // because PacksFeedFilters/getPacksFeed never forwarded it.
  it("re-fetches with the selected language when one is chosen", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [PACK_A],
      total: 1,
      page: 1,
      limit: 25,
    });
    render(<HomeFeed />);
    await screen.findByText("Best Anime Openings");

    await pickLanguage(user, "Українська");

    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ languages: ["uk"] }),
      ),
    );
  });

  it("stops filtering by language when 'All' is selected", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [PACK_A],
      total: 1,
      page: 1,
      limit: 25,
    });
    render(<HomeFeed />);
    await screen.findByText("Best Anime Openings");

    await pickLanguage(user, "Українська");
    await pickLanguage(user, "All");
    // Selecting a format after clearing the language moves us to a filter
    // combination that has NOT been fetched yet, so a real request fires and
    // we can still assert what the cleared language serialises to. Without it,
    // "All" alone returns to the mount combination and is served from the
    // React Query cache (see packs-feed.queries.ts) with no request at all.
    await user.click(screen.getByRole("button", { name: "Sacrifice One" }));

    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ languages: [], format: "sacrifice_one" }),
      ),
    );
  });

  it("re-fetches with the selected format when a format chip is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [PACK_A],
      total: 1,
      page: 1,
      limit: 25,
    });
    render(<HomeFeed />);
    await screen.findByText("Best Anime Openings");

    // Format pills are inline in the bar — no popover to open.
    await user.click(screen.getByRole("button", { name: "Sacrifice One" }));

    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith({
        format: "sacrifice_one",
        tags: [],
        languages: [],
        sort: "popular",
        window: "month",
        limit: 25,
      }),
    );
  });

  describe("date sort", () => {
    async function renderAndPickDate() {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 1,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await screen.findByText("Best Anime Openings");
      await openSort(user);
      await user.click(screen.getByRole("button", { name: "Date" }));
      return user;
    }

    it("fetches newest-first (and drops the popularity window) when Date is picked", async () => {
      await renderAndPickDate();

      await waitFor(() =>
        expect(packsClient.list).toHaveBeenLastCalledWith({
          format: undefined,
          tags: [],
          languages: [],
          sort: "newest",
          window: undefined,
          limit: 25,
        }),
      );
    });

    it("fetches oldest-first when Oldest first is picked", async () => {
      const user = await renderAndPickDate();

      await user.click(screen.getByRole("button", { name: "Oldest first" }));

      await waitFor(() =>
        expect(packsClient.list).toHaveBeenLastCalledWith({
          format: undefined,
          tags: [],
          languages: [],
          sort: "oldest",
          window: undefined,
          limit: 25,
        }),
      );
    });

    it("resets to newest-first when Date is re-selected after Oldest first", async () => {
      const user = await renderAndPickDate();
      await user.click(screen.getByRole("button", { name: "Oldest first" }));

      await user.click(screen.getByRole("button", { name: "Popular" }));
      await user.click(screen.getByRole("button", { name: "Date" }));

      // Asserted on the control rather than the request: returning to a
      // filter combination already in the React Query cache is served from it
      // without a refetch (see packs-feed.queries.ts), so "the last call" is no
      // longer an observable for state that reset correctly. The chip is —
      // and it is what the user actually sees.
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Newest first" }),
        ).toHaveAttribute("aria-pressed", "true"),
      );
      expect(
        screen.getByRole("button", { name: "Oldest first" }),
      ).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("applies the drafted tags to the fetch only when Apply is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [PACK_A],
      total: 1,
      page: 1,
      limit: 25,
    });
    render(<HomeFeed />);
    await screen.findByText("Best Anime Openings");
    await waitFor(() => expect(packsClient.list).toHaveBeenCalledTimes(1));

    await openTags(user);
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("checkbox", { name: "Music" }));

    // Drafting tags must not refetch until Apply is pressed.
    expect(packsClient.list).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith({
        format: undefined,
        tags: ["Anime", "Music"],
        languages: [],
        sort: "popular",
        window: "month",
        limit: 25,
      }),
    );
    // The count rides on the Tags trigger as a badge.
    expect(tagsTrigger()).toHaveTextContent("2");
  });

  it("re-opening the picker and applying a removal updates the fetch", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [PACK_A],
      total: 1,
      page: 1,
      limit: 25,
    });
    render(<HomeFeed />);
    await screen.findByText("Best Anime Openings");

    await openTags(user);
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("checkbox", { name: "Music" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith({
        format: undefined,
        tags: ["Anime", "Music"],
        languages: [],
        sort: "popular",
        window: "month",
        limit: 25,
      }),
    );

    await openTags(user);
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith({
        format: undefined,
        tags: ["Music"],
        languages: [],
        sort: "popular",
        window: "month",
        limit: 25,
      }),
    );
    expect(tagsTrigger()).toHaveTextContent("1");
  });

  it("discarding the picker with Cancel does not change the fetch", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [PACK_A],
      total: 1,
      page: 1,
      limit: 25,
    });
    render(<HomeFeed />);
    await screen.findByText("Best Anime Openings");
    await waitFor(() => expect(packsClient.list).toHaveBeenCalledTimes(1));

    await openTags(user);
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(packsClient.list).toHaveBeenCalledTimes(1);
    expect(tagsTrigger()).toBeInTheDocument();
  });

  it("includes a 1v1 filter chip", async () => {
    vi.mocked(packsClient.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    });
    render(<HomeFeed />);
    expect(
      await screen.findByRole("button", { name: "1v1" }),
    ).toBeInTheDocument();
  });

  describe("search", () => {
    // Search is URL-driven now: the global top-bar search routes to `/?q=…`, the
    // Server-Component home page reads it, and it arrives as `initialQuery`.
    it("has no in-feed search box", async () => {
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 1,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await screen.findByText("Best Anime Openings");

      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    });

    it("fetches with the seeded query from the URL", async () => {
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 1,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed initialQuery="anime" />);
      await screen.findByText("Best Anime Openings");

      await waitFor(() =>
        expect(packsClient.list).toHaveBeenLastCalledWith({
          format: undefined,
          tags: [],
          languages: [],
          q: "anime",
          sort: "popular",
          window: "month",
          limit: 25,
        }),
      );
    });
  });

  describe("popularity sort", () => {
    it("re-selecting Popular after Date restores popular/month", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalled());

      await openSort(user);
      await user.click(screen.getByRole("button", { name: "Date" }));
      await user.click(screen.getByRole("button", { name: "Popular" }));

      // popular/month was fetched on mount, so returning to it is a cache hit
      // and fires no request (the feed's staleTime is non-zero — a deliberate
      // Neon-compute saving, see packs-feed.queries.ts). Assert the restored
      // CONTROLS, which is what the user experiences, rather than a request
      // that correctly no longer happens.
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute(
          "aria-pressed",
          "true",
        ),
      );
    });

    it("changing the window while Popular is active sends the new window", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalled());

      await openSort(user);
      await user.click(screen.getByRole("button", { name: "Week" }));

      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.sort).toBe("popular");
        expect(lastCall?.window).toBe("week");
      });
    });

    it("sends newest/oldest (not a bare sort) when Date is active", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalled());

      await openSort(user);
      await user.click(screen.getByRole("button", { name: "Date" }));

      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.sort).toBe("newest");
        expect(lastCall?.window).toBeUndefined();
      });
    });

    it("resets the window back to the default when re-selecting Popular after switching away", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalled());

      await openSort(user);
      await user.click(screen.getByRole("button", { name: "Week" }));
      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.window).toBe("week");
      });

      await user.click(screen.getByRole("button", { name: "Date" }));
      await user.click(screen.getByRole("button", { name: "Popular" }));

      // The point of this test: the window must snap back to the default
      // rather than remembering "week" from before the round trip.
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute(
          "aria-pressed",
          "true",
        ),
      );
      expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });

  describe("filter persistence", () => {
    it("restores persisted filters from localStorage on mount", async () => {
      localStorage.setItem(
        "velanto:pack-filters",
        JSON.stringify({
          format: "save_one",
          tags: ["Anime"],
          sort: "popular",
          window: "week",
        }),
      );
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 1,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);

      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall).toMatchObject({ format: "save_one", tags: ["Anime"] });
      });
    });

    it("persists a filter change to localStorage", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalled());

      await openSort(user);
      await user.click(screen.getByRole("button", { name: "Week" }));

      await waitFor(() => {
        const stored = JSON.parse(
          localStorage.getItem("velanto:pack-filters") ?? "{}",
        );
        expect(stored.window).toBe("week");
      });
    });
  });

  describe("pagination", () => {
    beforeEach(() => {
      // goToPage smooth-scrolls to top; jsdom has no scroll implementation.
      window.scrollTo = vi.fn();
    });

    it("shows the range label but no pager when a single page covers everything", async () => {
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 1,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await screen.findByText("Best Anime Openings");

      expect(
        screen.queryByRole("navigation", { name: "Pagination" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1–1 of 1 pack")).toBeInTheDocument();
    });

    it("shows the range for the current page", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 60,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await screen.findByText("Best Anime Openings");
      expect(screen.getByText("Showing 1–25 of 60 packs")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "2" }));
      await waitFor(() =>
        expect(
          screen.getByText("Showing 26–50 of 60 packs"),
        ).toBeInTheDocument(),
      );
    });

    it("requests the chosen page when a page button is clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 60,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await screen.findByText("Best Anime Openings");
      await waitFor(() => expect(packsClient.list).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole("button", { name: "2" }));

      await waitFor(() =>
        expect(packsClient.list).toHaveBeenLastCalledWith(
          expect.objectContaining({ page: 2 }),
        ),
      );
    });

    it("snaps back to page 1 when a filter changes", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 60,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await screen.findByText("Best Anime Openings");

      await user.click(screen.getByRole("button", { name: "2" }));
      await waitFor(() =>
        expect(packsClient.list).toHaveBeenLastCalledWith(
          expect.objectContaining({ page: 2 }),
        ),
      );

      await user.click(screen.getByRole("button", { name: "Sacrifice One" }));

      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.format).toBe("sacrifice_one");
        expect(lastCall?.page).toBeUndefined();
      });
    });
  });
});
