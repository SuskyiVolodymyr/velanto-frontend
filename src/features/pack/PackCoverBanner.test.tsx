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
    { id: "g1", name: "2016", selectionMode: "manual", items: [] },
    { id: "g2", name: "2020", selectionMode: "manual", items: [] },
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
    const pack: Pack = { ...SAVE_ONE_PACK, groups: [SAVE_ONE_PACK.groups![0]] };
    render(<PackCoverBanner pack={pack} />);

    expect(screen.getByText("1 round")).toBeInTheDocument();
  });

  it("uses versusRounds for an nxn pack", () => {
    const pack: Pack = {
      ...SAVE_ONE_PACK,
      format: "nxn",
      groups: undefined,
      categories: [
        { id: "ca", name: "Boys", items: [] },
        { id: "cb", name: "Girls", items: [] },
      ],
      versusRounds: 8,
      versusN: 1,
    };
    render(<PackCoverBanner pack={pack} />);

    expect(screen.getByText("NxN")).toBeInTheDocument();
    expect(screen.getByText("8 rounds")).toBeInTheDocument();
  });
});
