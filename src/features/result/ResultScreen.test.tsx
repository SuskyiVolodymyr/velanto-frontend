import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultScreen } from "./ResultScreen";
import { encodePicks } from "@/src/shared/lib/share-url";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));

const PACK: Pack = {
  id: "pack-1",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  tags: [],
  groups: [
    {
      id: "g1",
      name: "2016",
      selectionMode: "manual",
      items: [
        {
          id: "i1",
          type: "text",
          title: "Guren no Yumiya",
          value: "Guren no Yumiya",
        },
        { id: "i2", type: "text", title: "Redo", value: "Redo" },
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
  likes: 0,
  dislikes: 0,
  myVote: null,
};

const RESULTS: PackResults = {
  packId: "pack-1",
  format: "save_one",
  totalPlays: 4,
  rounds: [
    {
      groupId: "g1",
      groupName: "2016",
      items: [
        {
          itemId: "i1",
          itemTitle: "Guren no Yumiya",
          count: 3,
          percentage: 75,
        },
        { itemId: "i2", itemTitle: "Redo", count: 1, percentage: 25 },
      ],
    },
  ],
};

beforeEach(() => {
  sessionStorage.clear();
  searchParams = new URLSearchParams();
});

describe("ResultScreen", () => {
  it("shows the player's own pick and its community agreement % per round", async () => {
    sessionStorage.setItem(
      "velanto:last-play:pack-1",
      JSON.stringify([{ groupId: "g1", itemId: "i1" }]),
    );

    render(<ResultScreen pack={PACK} results={RESULTS} />);

    expect(
      await screen.findByText(/Your pick:\s*Guren no Yumiya/),
    ).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText(/4 plays recorded/)).toBeInTheDocument();
  });

  it("falls back to the aggregate breakdown when there is no recorded play for this pack", () => {
    render(<ResultScreen pack={PACK} results={RESULTS} />);

    expect(screen.queryByText("Your pick")).not.toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("links back to play the pack again", () => {
    render(<ResultScreen pack={PACK} results={RESULTS} />);

    expect(screen.getByRole("link", { name: "Play again" })).toHaveAttribute(
      "href",
      "/packs/pack-1/play",
    );
  });

  it("falls back to the aggregate breakdown when the recorded pick's item isn't in this round's results", async () => {
    sessionStorage.setItem(
      "velanto:last-play:pack-1",
      JSON.stringify([{ groupId: "g1", itemId: "does-not-exist" }]),
    );

    render(<ResultScreen pack={PACK} results={RESULTS} />);

    expect(await screen.findByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.queryByText(/Your pick/)).not.toBeInTheDocument();
  });

  it("renders without crashing when the pack has no recorded plays yet", () => {
    const emptyResults: PackResults = {
      packId: "pack-1",
      format: "save_one",
      totalPlays: 0,
      rounds: [
        {
          groupId: "g1",
          groupName: "2016",
          items: [
            {
              itemId: "i1",
              itemTitle: "Guren no Yumiya",
              count: 0,
              percentage: 0,
            },
            { itemId: "i2", itemTitle: "Redo", count: 0, percentage: 0 },
          ],
        },
      ],
    };

    render(<ResultScreen pack={PACK} results={emptyResults} />);

    expect(screen.getByText(/0 plays recorded/)).toBeInTheDocument();
    expect(screen.getAllByText("0%")).toHaveLength(2);
  });

  it("delegates to RankResultScreen for rank_blind results", () => {
    const rankPack: Pack = { ...PACK, format: "rank_blind" };
    const rankResults: RankResults = {
      packId: "pack-1",
      format: "rank_blind",
      totalPlays: 1,
      rounds: [
        {
          groupId: "g1",
          groupName: "2016",
          items: [
            {
              itemId: "i1",
              itemTitle: "Guren no Yumiya",
              timesRanked: 1,
              averagePosition: 0,
              positionCounts: [1],
            },
          ],
        },
      ],
    };

    render(<ResultScreen pack={rankPack} results={rankResults} />);

    expect(screen.getByText(/avg 0.*ranked 1x/)).toBeInTheDocument();
  });

  it("shows a Share result button for an approved pack", () => {
    render(<ResultScreen pack={PACK} results={RESULTS} />);
    expect(
      screen.getByRole("button", { name: "Share result" }),
    ).toBeInTheDocument();
  });

  it("hides the Share result button for a non-approved pack", () => {
    render(
      <ResultScreen pack={{ ...PACK, status: "pending" }} results={RESULTS} />,
    );
    expect(
      screen.queryByRole("button", { name: "Share result" }),
    ).not.toBeInTheDocument();
  });

  it("renders the sharer's picks and a shared-result note when opened via a ?p= link", async () => {
    searchParams = new URLSearchParams({
      p: encodePicks([{ groupId: "g1", itemId: "i1" }]),
    });

    render(<ResultScreen pack={PACK} results={RESULTS} />);

    expect(
      await screen.findByText(/viewing a shared result/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Pick:\s*Guren no Yumiya/)).toBeInTheDocument();
    expect(screen.queryByText(/Your pick/)).not.toBeInTheDocument();
  });
});
