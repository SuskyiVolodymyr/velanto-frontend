import { describe, expect, it, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RankResultScreen } from "./RankResultScreen";
import { encodePicks } from "@/src/shared/lib/share-url";
import type { Pack } from "@/src/shared/types/pack";
import type { RankResults } from "@/src/shared/types/play-results";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));

const RANK_PACK: Pack = {
  id: "pack-rank",
  title: "Anime Openers, Ranked",
  description: "Place each pick blind into a growing ranked list.",
  coverTone: "#2b2a3a",
  format: "rank_blind",
  tags: [],
  groups: [
    {
      id: "g1",
      name: "Openers",
      items: [
        {
          id: "i1",
          type: "text",
          title: "Kaikai Kitan",
          value: "Kaikai Kitan",
        },
        { id: "i2", type: "text", title: "Redo", value: "Redo" },
      ],
    },
  ],
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

const RANK_RESULTS: RankResults = {
  packId: "pack-rank",
  format: "rank_blind",
  totalPlays: 2,
  rounds: [
    {
      roundIndex: 0,
      items: [
        {
          itemId: "i1",
          itemTitle: "Kaikai Kitan",
          timesRanked: 2,
          averagePosition: 0,
          positionCounts: [2, 0],
        },
        {
          itemId: "i2",
          itemTitle: "Redo",
          timesRanked: 2,
          averagePosition: 1,
          positionCounts: [0, 2],
        },
      ],
    },
  ],
};

beforeEach(() => {
  sessionStorage.clear();
  searchParams = new URLSearchParams();
});

describe("RankResultScreen", () => {
  it("sorts items by averagePosition (best first) and shows avg/timesRanked captions", () => {
    render(<RankResultScreen pack={RANK_PACK} results={RANK_RESULTS} />);

    const titles = screen
      .getAllByText(/Kaikai Kitan|Redo/)
      .map((el) => el.textContent);
    expect(titles).toEqual(["Kaikai Kitan", "Redo"]);
    expect(screen.getByText(/avg 0.*ranked 2x/)).toBeInTheDocument();
    expect(screen.getByText(/avg 1.*ranked 2x/)).toBeInTheDocument();
  });

  it("highlights the player's own placement and shows an agreement count", () => {
    sessionStorage.setItem(
      "velanto:last-play:pack-rank",
      JSON.stringify([
        { roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 },
      ]),
    );

    render(<RankResultScreen pack={RANK_PACK} results={RANK_RESULTS} />);

    expect(
      screen.getByText(/You placed this #1.*1 other play agreed/),
    ).toBeInTheDocument();
  });

  it("hides items that weren't in the player's own play for a round they played", () => {
    sessionStorage.setItem(
      "velanto:last-play:pack-rank",
      JSON.stringify([
        { roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 },
      ]),
    );

    render(<RankResultScreen pack={RANK_PACK} results={RANK_RESULTS} />);

    // The player ranked i1 but never saw i2 in their play — i2 is dropped
    // rather than shown with a "not in your play" note.
    expect(screen.getByText("Kaikai Kitan")).toBeInTheDocument();
    expect(screen.queryByText("Redo")).not.toBeInTheDocument();
  });

  it("shows the full pool for a round the player never played", () => {
    render(<RankResultScreen pack={RANK_PACK} results={RANK_RESULTS} />);

    // No recorded play for this pack → fall back to the aggregate pool so the
    // round isn't blank.
    expect(screen.getByText("Kaikai Kitan")).toBeInTheDocument();
    expect(screen.getByText("Redo")).toBeInTheDocument();
    expect(screen.queryByText(/You placed this/)).not.toBeInTheDocument();
  });

  it("renders without crashing when there are no recorded plays yet", () => {
    const emptyResults: RankResults = {
      packId: "pack-rank",
      format: "rank_blind",
      totalPlays: 0,
      rounds: [
        {
          roundIndex: 0,
          items: [
            {
              itemId: "i1",
              itemTitle: "Kaikai Kitan",
              timesRanked: 0,
              averagePosition: 0,
              positionCounts: [0, 0],
            },
            {
              itemId: "i2",
              itemTitle: "Redo",
              timesRanked: 0,
              averagePosition: 0,
              positionCounts: [0, 0],
            },
          ],
        },
      ],
    };

    render(<RankResultScreen pack={RANK_PACK} results={emptyResults} />);

    expect(screen.getByText(/0 plays recorded/)).toBeInTheDocument();
  });

  it("shows a Share result button for an approved pack", () => {
    render(<RankResultScreen pack={RANK_PACK} results={RANK_RESULTS} />);
    expect(
      screen.getByRole("button", { name: "Share result" }),
    ).toBeInTheDocument();
  });

  it("hides the Share result button for a non-approved pack", () => {
    render(
      <RankResultScreen
        pack={{ ...RANK_PACK, status: "pending" }}
        results={RANK_RESULTS}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Share result" }),
    ).not.toBeInTheDocument();
  });

  it("shows the shared-result note when opened via a ?p= link", async () => {
    searchParams = new URLSearchParams({
      p: encodePicks([
        { roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 },
      ]),
    });
    render(<RankResultScreen pack={RANK_PACK} results={RANK_RESULTS} />);
    expect(
      await screen.findByText(/viewing a shared result/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Placed #1/)).toBeInTheDocument();
    expect(screen.queryByText(/You placed this/)).not.toBeInTheDocument();
  });
});
