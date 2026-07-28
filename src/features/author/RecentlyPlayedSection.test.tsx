import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RecentlyPlayedSection } from "./RecentlyPlayedSection";
import { useRecentlyPlayed } from "./api/recently-played.queries";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("./api/recently-played.queries");
vi.mock("@/src/shared/components/PlayHistoryToggle", () => ({
  PlayHistoryToggle: () => <div data-testid="play-history-toggle" />,
}));

const mockedUseRecentlyPlayed = vi.mocked(useRecentlyPlayed);

function pack(id: string, title: string): Pack {
  return { id, title, format: "save_one" } as Pack;
}

function mockPages(
  items: Pack[],
  overrides: Partial<ReturnType<typeof useRecentlyPlayed>> = {},
) {
  mockedUseRecentlyPlayed.mockReturnValue({
    data: { pages: [{ items, total: items.length }] },
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useRecentlyPlayed>);
}

describe("RecentlyPlayedSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a row per played pack when visible", () => {
    mockPages([pack("p1", "First pack"), pack("p2", "Second pack")]);
    render(<RecentlyPlayedSection userId="u1" visible />);

    expect(screen.getByText("First pack")).toBeInTheDocument();
    expect(screen.getByText("Second pack")).toBeInTheDocument();
  });

  it("renders each row's format badge, title link, and a Play again action link", () => {
    mockPages([pack("p1", "First pack")]);
    render(<RecentlyPlayedSection userId="u1" visible />);

    expect(screen.getByText("Save One")).toBeInTheDocument();

    const titleLink = screen.getByRole("link", { name: "First pack" });
    expect(titleLink).toHaveAttribute("href", "/packs/p1");

    const playAgainLinks = screen.getAllByRole("link", { name: "Play again" });
    expect(playAgainLinks).toHaveLength(1);
    expect(playAgainLinks[0]).toHaveAttribute("href", "/packs/p1");
  });

  it("renders nothing when the viewer may not see the history", () => {
    mockPages([pack("p1", "First pack")]);
    const { container } = render(
      <RecentlyPlayedSection userId="u1" visible={false} />,
    );
    expect(container).toBeEmptyDOMElement();
    // Gated off — the query is disabled, so nothing renders even with data.
    expect(screen.queryByText("First pack")).not.toBeInTheDocument();
  });

  it("collapses entirely when there are no recently-played packs and showEmptyState is off", () => {
    mockPages([]);
    const { container } = render(<RecentlyPlayedSection userId="u1" visible />);
    expect(container).toBeEmptyDOMElement();
  });

  it("collapses while the first page is still loading, even with showEmptyState on", () => {
    mockPages([], { isLoading: true });
    const { container } = render(
      <RecentlyPlayedSection userId="u1" visible showEmptyState />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a placeholder plus the shared toggle on your own empty profile", () => {
    mockPages([]);
    render(<RecentlyPlayedSection userId="u1" visible showEmptyState />);

    expect(screen.getByTestId("play-history-toggle")).toBeInTheDocument();
    expect(
      screen.getByText("You haven't played any packs yet."),
    ).toBeInTheDocument();
  });

  it("renders the shared toggle above the row list on your own non-empty profile", () => {
    mockPages([pack("p1", "First pack")]);
    render(<RecentlyPlayedSection userId="u1" visible showEmptyState />);

    expect(screen.getByTestId("play-history-toggle")).toBeInTheDocument();
    expect(screen.getByText("First pack")).toBeInTheDocument();
  });

  it("does not render the toggle on someone else's profile", () => {
    mockPages([pack("p1", "First pack")]);
    render(<RecentlyPlayedSection userId="u1" visible />);

    expect(screen.queryByTestId("play-history-toggle")).not.toBeInTheDocument();
  });

  it("fetches the next page when Load more is clicked", async () => {
    const user = userEvent.setup();
    const fetchNextPage = vi.fn();
    mockPages([pack("p1", "First pack")], {
      hasNextPage: true,
      fetchNextPage,
    });
    render(<RecentlyPlayedSection userId="u1" visible />);

    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(fetchNextPage).toHaveBeenCalled();
  });
});
