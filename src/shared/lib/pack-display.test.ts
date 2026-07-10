import { describe, expect, it } from "vitest";
import { FORMAT_LABELS, getRoundsCount } from "./pack-display";
import type { Pack } from "@/src/shared/types/pack";

const BASE_PACK = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  tags: [] as Pack["tags"],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved" as const,
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

describe("FORMAT_LABELS", () => {
  it("has a human-readable label for every supported format", () => {
    expect(FORMAT_LABELS.save_one).toBe("Save One");
    expect(FORMAT_LABELS.sacrifice_one).toBe("Sacrifice One");
    expect(FORMAT_LABELS.nxn).toBe("NxN");
    expect(FORMAT_LABELS.rank_blind).toBe("Rank Blind");
  });

  it("has a label for the 1v1 format", () => {
    expect(FORMAT_LABELS["1v1"]).toBe("1v1");
  });
});

describe("getRoundsCount", () => {
  it("counts groups as rounds for save_one/sacrifice_one packs", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [
        { id: "g1", name: "2016", selectionMode: "manual", items: [] },
        { id: "g2", name: "2020", selectionMode: "manual", items: [] },
      ],
    };

    expect(getRoundsCount(pack)).toBe(2);
  });

  it("uses versusRounds for nxn packs", () => {
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

    expect(getRoundsCount(pack)).toBe(8);
  });

  it("counts groups as rounds for rank_blind packs", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "rank_blind",
      groups: [
        { id: "g1", name: "Openers", selectionMode: "manual", items: [] },
        {
          id: "g2",
          name: "Closers",
          selectionMode: "random",
          sampleSize: 2,
          items: [],
        },
      ],
    };

    expect(getRoundsCount(pack)).toBe(2);
  });

  it("counts groups.length as the rounds count for a 1v1 pack", () => {
    const pack = {
      id: "p1",
      title: "t",
      description: "d",
      coverTone: "#000",
      format: "1v1" as const,
      tags: [],
      groups: [
        {
          id: "g1",
          name: "Round 1",
          selectionMode: "manual" as const,
          items: [],
        },
        {
          id: "g2",
          name: "Round 2",
          selectionMode: "manual" as const,
          items: [],
        },
      ],
      authorId: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
      totalPlays: 0,
      avgAgreementPercent: 0,
      status: "approved" as const,
      rejectionReason: null,
      score: 0,
      likes: 0,
      dislikes: 0,
      myVote: null,
    };
    expect(getRoundsCount(pack)).toBe(2);
  });
});
