import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankResultScreen } from "./RankResultScreen";
import type { Pack } from "@/src/shared/types/pack";
import type { RankResults } from "@/src/shared/types/play-results";

const PACK: Pack = {
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
      selectionMode: "manual",
      items: [
        { id: "i1", type: "text", title: "Kaikai Kitan", value: "Kaikai Kitan" },
        { id: "i2", type: "text", title: "Redo", value: "Redo" },
      ],
    },
  ],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
};

const RESULTS: RankResults = {
  packId: "pack-rank",
  format: "rank_blind",
  totalPlays: 2,
  rounds: [
    {
      groupId: "g1",
      groupName: "Openers",
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
});

describe("RankResultScreen", () => {
  it("sorts items by averagePosition (best first) and shows avg/timesRanked captions", () => {
    render(<RankResultScreen pack={PACK} results={RESULTS} />);

    const titles = screen.getAllByText(/Kaikai Kitan|Redo/).map((el) => el.textContent);
    expect(titles).toEqual(["Kaikai Kitan", "Redo"]);
    expect(screen.getByText(/avg 0.*ranked 2x/)).toBeInTheDocument();
    expect(screen.getByText(/avg 1.*ranked 2x/)).toBeInTheDocument();
  });

  it("highlights the player's own placement and shows an agreement count", () => {
    sessionStorage.setItem(
      "velanto:last-play:pack-rank",
      JSON.stringify([{ groupId: "g1", itemId: "i1", position: 0 }]),
    );

    render(<RankResultScreen pack={PACK} results={RESULTS} />);

    expect(screen.getByText(/You placed this #1.*1 other play agreed/)).toBeInTheDocument();
  });

  it("shows a neutral note for an item that wasn't in the player's own play", () => {
    sessionStorage.setItem(
      "velanto:last-play:pack-rank",
      JSON.stringify([{ groupId: "g1", itemId: "i1", position: 0 }]),
    );

    render(<RankResultScreen pack={PACK} results={RESULTS} />);

    expect(screen.getByText("Not in your play this round")).toBeInTheDocument();
  });

  it("shows no personal annotations when the player never played this pack", () => {
    render(<RankResultScreen pack={PACK} results={RESULTS} />);

    expect(screen.queryByText(/You placed this/)).not.toBeInTheDocument();
    expect(screen.queryByText("Not in your play this round")).not.toBeInTheDocument();
  });

  it("renders without crashing when there are no recorded plays yet", () => {
    const emptyResults: RankResults = {
      packId: "pack-rank",
      format: "rank_blind",
      totalPlays: 0,
      rounds: [
        {
          groupId: "g1",
          groupName: "Openers",
          items: [
            { itemId: "i1", itemTitle: "Kaikai Kitan", timesRanked: 0, averagePosition: 0, positionCounts: [0, 0] },
            { itemId: "i2", itemTitle: "Redo", timesRanked: 0, averagePosition: 0, positionCounts: [0, 0] },
          ],
        },
      ],
    };

    render(<RankResultScreen pack={PACK} results={emptyResults} />);

    expect(screen.getByText(/0 plays recorded/)).toBeInTheDocument();
  });
});
