import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PlayRouter } from "./PlayRouter";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/features/play/PlayScreen", () => ({
  PlayScreen: () => <div>PlayScreen</div>,
}));
vi.mock("@/src/features/play/RankPlayScreen", () => ({
  RankPlayScreen: () => <div>RankPlayScreen</div>,
}));
vi.mock("@/src/features/play/HeadToHeadPlayScreen", () => ({
  HeadToHeadPlayScreen: () => <div>HeadToHeadPlayScreen</div>,
}));

const BASE_PACK: Pack = {
  id: "p1",
  title: "Test",
  description: "",
  coverTone: "#000",
  format: "save_one",
  tags: [],
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

describe("PlayRouter", () => {
  it("renders RankPlayScreen for rank_blind packs", () => {
    render(<PlayRouter pack={{ ...BASE_PACK, format: "rank_blind" }} />);
    expect(screen.getByText("RankPlayScreen")).toBeInTheDocument();
  });

  it("renders HeadToHeadPlayScreen for 1v1 packs", () => {
    render(<PlayRouter pack={{ ...BASE_PACK, format: "1v1" }} />);
    expect(screen.getByText("HeadToHeadPlayScreen")).toBeInTheDocument();
  });

  it("renders PlayScreen for every other format", () => {
    render(<PlayRouter pack={{ ...BASE_PACK, format: "save_one" }} />);
    expect(screen.getByText("PlayScreen")).toBeInTheDocument();
  });
});
