import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PackStats } from "./PackStats";
import type { PackResults } from "@/src/shared/types/play-results";

describe("PackStats", () => {
  it("shows a no-plays message when nobody has played yet", () => {
    const results: PackResults = { packId: "pack-a", totalPlays: 0, rounds: [] };
    render(<PackStats results={results} />);

    expect(screen.getByText("No plays yet — be the first!")).toBeInTheDocument();
  });

  it("shows total plays and the top pick per round", () => {
    const results: PackResults = {
      packId: "pack-a",
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

  it("skips a round with no items rather than crashing", () => {
    const results: PackResults = {
      packId: "pack-a",
      totalPlays: 5,
      rounds: [{ groupId: "g1", groupName: "Empty round", items: [] }],
    };

    expect(() => render(<PackStats results={results} />)).not.toThrow();
    expect(screen.queryByText("Empty round")).not.toBeInTheDocument();
  });
});
