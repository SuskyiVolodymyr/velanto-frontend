import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackCoverBanner } from "./PackCoverBanner";
import type { Pack } from "@/src/shared/types/pack";

// The author line is a client island with its own auth-gated hover-card fetch
// and dedicated tests; stub it so these hero-layout assertions stay focused.
vi.mock("./PackBannerAuthor", () => ({
  PackBannerAuthor: () => <div>PackBannerAuthor</div>,
}));

const SAVE_ONE_PACK: Pack = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  format: "save_one",
  tags: [],
  groups: [
    { id: "g1", name: "2016", items: [] },
    { id: "g2", name: "2020", items: [] },
  ],
  rounds: [
    { id: "r1", slots: [{ groupId: "g1", mode: "manual" }] },
    { id: "r2", slots: [{ groupId: "g2", mode: "manual" }] },
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

describe("PackCoverBanner", () => {
  it("shows the pack title, format badge, and round count", () => {
    render(<PackCoverBanner pack={SAVE_ONE_PACK} />);

    expect(screen.getByText("Best Anime Openings")).toBeInTheDocument();
    expect(screen.getByText("Save One")).toBeInTheDocument();
    expect(screen.getByText("2 rounds")).toBeInTheDocument();
  });

  it("singularizes the round count for a single round", () => {
    const pack: Pack = { ...SAVE_ONE_PACK, rounds: [SAVE_ONE_PACK.rounds[0]] };
    render(<PackCoverBanner pack={pack} />);

    expect(screen.getByText("1 round")).toBeInTheDocument();
  });

  it("uses the rounds length for an nxn pack", () => {
    const pack: Pack = {
      ...SAVE_ONE_PACK,
      format: "nxn",
      groups: [
        { id: "a", name: "Boys", items: [] },
        { id: "b", name: "Girls", items: [] },
      ],
      rounds: Array.from({ length: 8 }, (_, i) => ({
        id: `r${i + 1}`,
        slots: [
          { groupId: "a", mode: "random" as const, count: 1 },
          { groupId: "b", mode: "random" as const, count: 1 },
        ],
      })),
    };
    render(<PackCoverBanner pack={pack} />);

    expect(screen.getByText("NxN")).toBeInTheDocument();
    expect(screen.getByText("8 rounds")).toBeInTheDocument();
  });
});
