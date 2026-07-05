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
});
