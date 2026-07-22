import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlayRouter } from "./PlayRouter";
import { playsClient } from "@/src/shared/lib/plays-client";
import type { Pack } from "@/src/shared/types/pack";

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/src/shared/lib/plays-client", () => ({
  playsClient: { record: vi.fn(), getResults: vi.fn(), getSharedPicks: vi.fn() },
}));
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
  language: "en",
  format: "save_one",
  tags: [],
  groups: [],
  rounds: [],
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlayRouter", () => {
  it("renders RankPlayScreen for rank_blind packs", () => {
    render(<PlayRouter pack={{ ...BASE_PACK, format: "rank_blind" }} />);
    expect(screen.getByText("RankPlayScreen")).toBeInTheDocument();
  });

  it("renders HeadToHeadPlayScreen for 1v1 packs", () => {
    render(<PlayRouter pack={{ ...BASE_PACK, format: "1v1" }} />);
    expect(screen.getByText("HeadToHeadPlayScreen")).toBeInTheDocument();
  });

  it.each(["save_one", "sacrifice_one", "nxn"] as const)(
    "renders PlayScreen for the elimination format %s",
    (format) => {
      render(<PlayRouter pack={{ ...BASE_PACK, format }} />);
      expect(screen.getByText("PlayScreen")).toBeInTheDocument();
    },
  );

  // UI-EXCLUDED:save_one_friends (velanto-frontend#368). THIS is the test the
  // PR that ships room-based multiplayer has to change: replace the 404 with
  // its real screen. Until then the pack must not reach PlayScreen — the wrong
  // mechanic would run, the instruction copy would render as the literal
  // "play." and the play would be RECORDED (anonymous plays count toward pack
  // stats), which is data corruption, not a cosmetic bug.
  describe("save_one_friends — no play path in this build", () => {
    const friendsPack: Pack = { ...BASE_PACK, format: "save_one_friends" };

    it("does not render PlayScreen", () => {
      expect(() => render(<PlayRouter pack={friendsPack} />)).toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(screen.queryByText("PlayScreen")).not.toBeInTheDocument();
    });

    it("404s instead of falling through to a play screen", () => {
      expect(() => render(<PlayRouter pack={friendsPack} />)).toThrow();
      expect(notFound).toHaveBeenCalled();
    });

    it("records no play", () => {
      expect(() => render(<PlayRouter pack={friendsPack} />)).toThrow();
      expect(playsClient.record).not.toHaveBeenCalled();
    });
  });

  // A format the API knows and this build does not must behave like
  // save_one_friends, not like save_one: the `never` parameter is only a
  // compile-time gate, and API data outruns the deployed bundle.
  it("404s for an unknown wire format rather than defaulting to PlayScreen", () => {
    const rogue = { ...BASE_PACK, format: "telepathy" } as unknown as Pack;
    expect(() => render(<PlayRouter pack={rogue} />)).toThrow();
    expect(notFound).toHaveBeenCalled();
    expect(screen.queryByText("PlayScreen")).not.toBeInTheDocument();
  });
});
