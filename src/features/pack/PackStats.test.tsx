import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PackStats } from "./PackStats";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

describe("PackStats", () => {
  it("shows a no-plays message when nobody has played yet", () => {
    const results: PackResults = { packId: "pack-a", format: "save_one", totalPlays: 0, rounds: [] };
    render(<PackStats results={results} />);

    expect(screen.getByText("No plays yet — be the first!")).toBeInTheDocument();
  });

  it("shows total plays and the top pick per round", () => {
    const results: PackResults = {
      packId: "pack-a",
      format: "save_one",
      totalPlays: 10,
      rounds: [
        {
          groupId: "g1",
          groupName: "2016",
          items: [
            { itemId: "i1", itemTitle: "Guren no Yumiya", count: 7, percentage: 70 },
            { itemId: "i2", itemTitle: "Redo", count: 3, percentage: 30 },
          ],
        },
        {
          groupId: "g2",
          groupName: "2020",
          items: [{ itemId: "i3", itemTitle: "Silhouette", count: 10, percentage: 100 }],
        },
      ],
    };
    render(<PackStats results={results} />);

    expect(screen.getByText("10 plays")).toBeInTheDocument();
    expect(screen.getByText("2016")).toBeInTheDocument();
    expect(screen.getByText("Guren no Yumiya — 70%")).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
    expect(screen.getByText("Silhouette — 100%")).toBeInTheDocument();
    expect(screen.queryByText("Redo")).not.toBeInTheDocument();
  });

  it("singularizes the play count for a single play", () => {
    const results: PackResults = {
      packId: "pack-a",
      format: "save_one",
      totalPlays: 1,
      rounds: [
        {
          groupId: "g1",
          groupName: "2016",
          items: [{ itemId: "i1", itemTitle: "Guren no Yumiya", count: 1, percentage: 100 }],
        },
      ],
    };
    render(<PackStats results={results} />);

    expect(screen.getByText("1 play")).toBeInTheDocument();
  });

  it("picks the first item as the winner on a percentage tie", () => {
    const results: PackResults = {
      packId: "pack-a",
      format: "save_one",
      totalPlays: 4,
      rounds: [
        {
          groupId: "g1",
          groupName: "2016",
          items: [
            { itemId: "i1", itemTitle: "Guren no Yumiya", count: 2, percentage: 50 },
            { itemId: "i2", itemTitle: "Redo", count: 2, percentage: 50 },
          ],
        },
      ],
    };
    render(<PackStats results={results} />);

    expect(screen.getByText("Guren no Yumiya — 50%")).toBeInTheDocument();
    expect(screen.queryByText("Redo — 50%")).not.toBeInTheDocument();
  });

  it("skips a round with no items rather than crashing", () => {
    const results: PackResults = {
      packId: "pack-a",
      format: "save_one",
      totalPlays: 5,
      rounds: [{ groupId: "g1", groupName: "Empty round", items: [] }],
    };

    expect(() => render(<PackStats results={results} />)).not.toThrow();
    expect(screen.queryByText("Empty round")).not.toBeInTheDocument();
  });

  it("shows the top-ranked item by lowest averagePosition for rank_blind results", () => {
    const results: RankResults = {
      packId: "pack-rank",
      format: "rank_blind",
      totalPlays: 6,
      rounds: [
        {
          groupId: "g1",
          groupName: "Openers",
          items: [
            { itemId: "i1", itemTitle: "Kaikai Kitan", timesRanked: 6, averagePosition: 0.5, positionCounts: [3, 3] },
            { itemId: "i2", itemTitle: "Redo", timesRanked: 6, averagePosition: 1.5, positionCounts: [0, 3] },
          ],
        },
      ],
    };
    render(<PackStats results={results} />);

    expect(screen.getByText("6 plays")).toBeInTheDocument();
    expect(screen.getByText("Openers")).toBeInTheDocument();
    expect(screen.getByText("Kaikai Kitan — avg 0.5")).toBeInTheDocument();
    expect(screen.queryByText(/Redo/)).not.toBeInTheDocument();
  });

  it("skips a rank_blind round with no items rather than crashing", () => {
    const results: RankResults = {
      packId: "pack-rank",
      format: "rank_blind",
      totalPlays: 2,
      rounds: [{ groupId: "g1", groupName: "Empty round", items: [] }],
    };

    expect(() => render(<PackStats results={results} />)).not.toThrow();
    expect(screen.queryByText("Empty round")).not.toBeInTheDocument();
  });
});
