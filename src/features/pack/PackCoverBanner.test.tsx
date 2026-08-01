import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PackCoverBanner } from "./PackCoverBanner";
import { HOT_PLAYS_THRESHOLD } from "@/src/features/home/hot-pack";
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
  language: "en",
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
  it("shows the pack title and format pill", () => {
    render(<PackCoverBanner pack={SAVE_ONE_PACK} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Best Anime Openings",
    );
    expect(screen.getByText("Save One")).toBeInTheDocument();
  });

  it("shows a HOT pill only for a pack over the plays threshold", () => {
    render(<PackCoverBanner pack={SAVE_ONE_PACK} />);
    expect(screen.queryByText("HOT")).toBeNull();

    render(
      <PackCoverBanner
        pack={{ ...SAVE_ONE_PACK, totalPlays: HOT_PLAYS_THRESHOLD }}
      />,
    );
    expect(screen.getByText("HOT")).toBeInTheDocument();
  });

  it("renders the custom cover image when a coverImageKey is set", () => {
    const { container } = render(
      <PackCoverBanner
        pack={{ ...SAVE_ONE_PACK, coverImageKey: "media/cover/hero.webp" }}
      />,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("media/cover/hero.webp");
    // The title/format still render over the cover.
    expect(screen.getByText("Best Anime Openings")).toBeInTheDocument();
  });

  it("renders no cover image (gradient only) when coverImageKey is absent", () => {
    const { container } = render(<PackCoverBanner pack={SAVE_ONE_PACK} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the format label for an nxn pack", () => {
    render(<PackCoverBanner pack={{ ...SAVE_ONE_PACK, format: "nxn" }} />);
    expect(screen.getByText("NxN")).toBeInTheDocument();
  });
});
