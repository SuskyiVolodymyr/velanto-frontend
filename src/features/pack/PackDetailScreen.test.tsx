import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { describe, it, expect, vi } from "vitest";
import { PackDetailScreen } from "./PackDetailScreen";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults } from "@/src/shared/types/play-results";

vi.mock("@/src/features/pack/VoteButtons", () => ({
  VoteButtons: () => <div>VoteButtons</div>,
}));
vi.mock("@/src/features/pack/CommentSection", () => ({
  CommentSection: () => <div>CommentSection</div>,
}));

const BASE_PACK: Pack = {
  id: "p1",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "2016",
      selectionMode: "manual",
      items: [
        { id: "i1", type: "text", title: "Opening A", value: "Opening A" },
      ],
    },
  ],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 3,
  dislikes: 1,
  myVote: null,
};

const RESULTS: PackResults = {
  packId: "p1",
  format: "save_one",
  totalPlays: 0,
  rounds: [],
};

describe("PackDetailScreen", () => {
  it("renders the pack's title, description, and a Play link", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} />);
    expect(screen.getByText("Best Anime Openings")).toBeInTheDocument();
    expect(
      screen.getByText("Pick your favorite each round."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Play now" })).toHaveAttribute(
      "href",
      "/packs/p1/play",
    );
  });

  it("lists each group as a chip with its item count for a non-nxn pack", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} />);
    expect(screen.getByText("2016")).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
    // The full item titles are no longer listed on the pack page.
    expect(screen.queryByText("Opening A")).not.toBeInTheDocument();
  });

  it("lists categories (not groups) as chips for an nxn pack", () => {
    const nxnPack: Pack = {
      ...BASE_PACK,
      format: "nxn",
      groups: undefined,
      categories: [
        {
          id: "c1",
          name: "Category A",
          items: [{ id: "i2", type: "text", title: "Item X", value: "Item X" }],
        },
      ],
    };
    render(<PackDetailScreen pack={nxnPack} results={RESULTS} />);
    expect(screen.getByText("Category A")).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
    expect(screen.queryByText("Item X")).not.toBeInTheDocument();
    expect(screen.queryByText("2016")).not.toBeInTheDocument();
  });

  it("shows a Share button for an approved pack", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} />);
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("hides the Share button for a non-approved pack", () => {
    render(
      <PackDetailScreen
        pack={{ ...BASE_PACK, status: "pending" }}
        results={RESULTS}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Share" }),
    ).not.toBeInTheDocument();
  });
});
