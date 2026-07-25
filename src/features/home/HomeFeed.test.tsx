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

// The secondary filters (tags + language) live behind the "Filters" popover and
// the sort behind its own popover — open them before driving those controls.
function openFilters(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: "Filters" }));
}
function openSort(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: "Sort by" }));
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

    await openFilters(user);
    await user.selectOptions(
      screen.getByRole("combobox", { name: /filter by language/i }),
      "Українська",
    );

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

    await openFilters(user);
    const language = screen.getByRole("combobox", {
      name: /filter by language/i,
    });
    await user.selectOptions(language, "Українська");
    await user.selectOptions(language, "All");

    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ languages: [] }),
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

    await openFilters(user);
    await user.click(screen.getByRole("button", { name: "Filter by tags" }));
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("checkbox", { name: "Music" }));

    // Drafting tags must not refetch until Apply is pressed.
    expect(packsClient.list).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Apply" }));
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
    expect(screen.getByRole("button", { name: "2 tags" })).toBeInTheDocument();
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

    await openFilters(user);
    await user.click(screen.getByRole("button", { name: "Filter by tags" }));
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("checkbox", { name: "Music" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
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

    await user.click(screen.getByRole("button", { name: "2 tags" }));
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
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
    expect(screen.getByRole("button", { name: "1 tag" })).toBeInTheDocument();
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

    await openFilters(user);
    await user.click(screen.getByRole("button", { name: "Filter by tags" }));
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(packsClient.list).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Filter by tags" }),
    ).toBeInTheDocument();
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
    it("re-selecting Popular after Date sends popular/month", async () => {
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

      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.sort).toBe("popular");
        expect(lastCall?.window).toBe("month");
      });
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

      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.sort).toBe("popular");
        expect(lastCall?.window).toBe("month");
      });
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
