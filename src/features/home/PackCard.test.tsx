import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PackCard } from "./PackCard";
import type { Pack } from "@/src/shared/types/pack";

const BASE_PACK = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  tags: ["Anime"] as Pack["tags"],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
};

describe("PackCard", () => {
  it("counts groups as rounds for a save_one pack", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [
        { id: "g1", name: "2016", selectionMode: "manual", items: [] },
        { id: "g2", name: "2020", selectionMode: "manual", items: [] },
      ],
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("2 rounds")).toBeInTheDocument();
    expect(screen.getByText("Save One")).toBeInTheDocument();
  });

  it("uses versusRounds as the round count for an nxn pack", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "nxn",
      categories: [
        { id: "ca", name: "Boys", items: [] },
        { id: "cb", name: "Girls", items: [] },
      ],
      versusRounds: 8,
      versusN: 1,
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("8 rounds")).toBeInTheDocument();
    expect(screen.getByText("NxN")).toBeInTheDocument();
  });

  it("shows 'No plays yet' when the pack has never been played", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [{ id: "g1", name: "2016", selectionMode: "manual", items: [] }],
      totalPlays: 0,
      avgAgreementPercent: 0,
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("No plays yet")).toBeInTheDocument();
  });

  it("shows the play count and agreement percentage when the pack has been played", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [{ id: "g1", name: "2016", selectionMode: "manual", items: [] }],
      totalPlays: 1,
      avgAgreementPercent: 75,
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("1 play · 75% agreement")).toBeInTheDocument();
  });

  it("pluralizes play count for more than one play", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [{ id: "g1", name: "2016", selectionMode: "manual", items: [] }],
      totalPlays: 124,
      avgAgreementPercent: 68,
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("124 plays · 68% agreement")).toBeInTheDocument();
  });
});
