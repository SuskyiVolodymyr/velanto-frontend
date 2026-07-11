import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
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
  status: "approved" as const,
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
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

  it("rounds a fractional agreement percentage for display", () => {
    const pack: Pack = {
      ...BASE_PACK,
      format: "save_one",
      groups: [{ id: "g1", name: "2016", selectionMode: "manual", items: [] }],
      totalPlays: 3,
      avgAgreementPercent: 33.3,
    };
    render(<PackCard pack={pack} />);

    expect(screen.getByText("3 plays · 33% agreement")).toBeInTheDocument();
  });

  it("shows a pending badge when showStatus is true and the pack is pending", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "pending" }}
        showStatus
      />,
    );
    expect(screen.getByText("Pending review")).toBeInTheDocument();
  });

  it("shows a rejected badge when showStatus is true and the pack is rejected", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "rejected" }}
        showStatus
      />,
    );
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("shows no status badge when showStatus is true but the pack is approved", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "approved" }}
        showStatus
      />,
    );
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
  });

  it("shows no status badge when showStatus is not passed, even for a pending pack", () => {
    render(
      <PackCard
        pack={{ ...BASE_PACK, format: "save_one", status: "pending" }}
      />,
    );
    expect(screen.queryByText("Pending review")).not.toBeInTheDocument();
  });
});
