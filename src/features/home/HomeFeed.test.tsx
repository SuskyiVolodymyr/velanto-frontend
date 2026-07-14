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

    await user.click(screen.getByRole("button", { name: "Sacrifice One" }));

    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith({
        format: "sacrifice_one",
        tags: [],
        sort: "popular",
        window: "month",
        limit: 25,
      }),
    );
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

    await user.click(screen.getByRole("button", { name: "Filter by tags" }));
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    await user.click(screen.getByRole("checkbox", { name: "Music" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(packsClient.list).toHaveBeenLastCalledWith({
        format: undefined,
        tags: ["Anime", "Music"],
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
    it("debounces search input before re-fetching with q", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 1,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalledTimes(1));

      await user.type(screen.getByRole("searchbox"), "anime");
      expect(packsClient.list).toHaveBeenCalledTimes(1);

      await waitFor(
        () =>
          expect(packsClient.list).toHaveBeenLastCalledWith({
            format: undefined,
            tags: [],
            q: "anime",
            sort: "popular",
            window: "month",
            limit: 25,
          }),
        { timeout: 1000 },
      );
    });

    it("trims leading/trailing whitespace before sending q", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 1,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalledTimes(1));

      await user.type(screen.getByRole("searchbox"), "  anime  ");

      await waitFor(
        () =>
          expect(packsClient.list).toHaveBeenLastCalledWith({
            format: undefined,
            tags: [],
            q: "anime",
            sort: "popular",
            window: "month",
            limit: 25,
          }),
        { timeout: 1000 },
      );
    });

    it("clearing the search box re-fetches without q", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [PACK_A],
        total: 1,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalledTimes(1));

      const searchBox = screen.getByRole("searchbox");
      await user.type(searchBox, "anime");
      await waitFor(
        () =>
          expect(packsClient.list).toHaveBeenLastCalledWith({
            format: undefined,
            tags: [],
            q: "anime",
            sort: "popular",
            window: "month",
            limit: 25,
          }),
        { timeout: 1000 },
      );

      await user.clear(searchBox);
      await waitFor(
        () =>
          expect(packsClient.list).toHaveBeenLastCalledWith({
            format: undefined,
            tags: [],
            q: undefined,
            sort: "popular",
            window: "month",
            limit: 25,
          }),
        { timeout: 1000 },
      );
    });
  });

  describe("popularity sort", () => {
    it("sends sort=popular and window=month by default", async () => {
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalled());
      const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
      expect(lastCall?.sort).toBe("popular");
      expect(lastCall?.window).toBe("month");
    });

    it("re-selecting Popular after Relevance sends popular/month", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalled());

      await user.click(screen.getByRole("button", { name: "Relevance" }));
      await user.click(screen.getByRole("button", { name: "Popular" }));

      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.sort).toBe("popular");
        expect(lastCall?.window).toBe("month");
      });
    });

    it("shows the window picker only when Popular is active", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalled());

      // Popular is the default, so the window picker is visible on mount.
      expect(screen.getByRole("button", { name: "Month" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Relevance" }));
      expect(
        screen.queryByRole("button", { name: "Month" }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Popular" }));
      expect(screen.getByRole("button", { name: "Month" })).toBeInTheDocument();
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

      // Default is month; switch to a different window and confirm it's sent.
      await user.click(screen.getByRole("button", { name: "Week" }));

      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.sort).toBe("popular");
        expect(lastCall?.window).toBe("week");
      });
    });

    it("switching back to Relevance omits sort and window from the next request", async () => {
      const user = userEvent.setup();
      vi.mocked(packsClient.list).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 25,
      });
      render(<HomeFeed />);
      await waitFor(() => expect(packsClient.list).toHaveBeenCalled());
      await user.click(screen.getByRole("button", { name: "Popular" }));
      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.sort).toBe("popular");
      });

      await user.click(screen.getByRole("button", { name: "Relevance" }));

      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.sort).toBeUndefined();
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

      // Move off the default window, then leave Popular and return to it.
      await user.click(screen.getByRole("button", { name: "Week" }));
      await waitFor(() => {
        const lastCall = vi.mocked(packsClient.list).mock.calls.at(-1)?.[0];
        expect(lastCall?.window).toBe("week");
      });

      await user.click(screen.getByRole("button", { name: "Relevance" }));
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
          sort: "relevance",
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

      await user.click(screen.getByRole("button", { name: "Popular" }));

      await waitFor(() => {
        const stored = JSON.parse(
          localStorage.getItem("velanto:pack-filters") ?? "{}",
        );
        expect(stored.sort).toBe("popular");
      });
    });
  });

  describe("pagination", () => {
    beforeEach(() => {
      // goToPage smooth-scrolls to top; jsdom has no scroll implementation.
      window.scrollTo = vi.fn();
    });

    it("hides the pager when a single page covers every result", async () => {
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
