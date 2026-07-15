import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RecentlyPlayedSection } from "./RecentlyPlayedSection";
import { useRecentlyPlayed } from "./api/recently-played.queries";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("./api/recently-played.queries");
vi.mock("@/src/features/home/PackCard", () => ({
  PackCard: ({ pack }: { pack: Pack }) => <div>{pack.title}</div>,
}));

const mockedUseRecentlyPlayed = vi.mocked(useRecentlyPlayed);

function pack(id: string, title: string): Pack {
  return { id, title } as Pack;
}

function mockPages(items: Pack[]) {
  mockedUseRecentlyPlayed.mockReturnValue({
    data: { pages: [{ items, total: items.length }] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  } as unknown as ReturnType<typeof useRecentlyPlayed>);
}

describe("RecentlyPlayedSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the heading and a card per played pack when visible", () => {
    mockPages([pack("p1", "First pack"), pack("p2", "Second pack")]);
    render(<RecentlyPlayedSection userId="u1" visible />);

    expect(
      screen.getByRole("heading", { name: "Recently played" }),
    ).toBeInTheDocument();
    expect(screen.getByText("First pack")).toBeInTheDocument();
    expect(screen.getByText("Second pack")).toBeInTheDocument();
  });

  it("renders both scroll-arrow controls with accessible labels", () => {
    mockPages([pack("p1", "First pack"), pack("p2", "Second pack")]);
    render(<RecentlyPlayedSection userId="u1" visible />);

    expect(screen.getByRole("button", { name: "Prev" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
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

  it("collapses entirely when there are no recently-played packs", () => {
    mockPages([]);
    const { container } = render(<RecentlyPlayedSection userId="u1" visible />);
    expect(container).toBeEmptyDOMElement();
  });
});
