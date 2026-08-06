import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import type { Item } from "@/src/shared/types/pack";
import { SpyRevealScreen } from "./SpyRevealScreen";
import { baseRoomState } from "./test-fixtures";
import type { RoomPlayerState, RoomState } from "./room-types";

// The results aside carries a Play again panel, which routes — the screen now
// shares the same shape solo's results have.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function item(id: string): Item {
  return { id, type: "text", title: `Title ${id}`, value: `Title ${id}` };
}

function player(userId: string, username: string): RoomPlayerState {
  return {
    userId,
    username,
    avatarKey: null,
    seat: Number(userId.slice(1)),
    connected: true,
    ready: true,
    next: false,
    claimedItemId: null,
    label: null,
  };
}

const ROSTER = [
  player("u1", "Alice"),
  player("u2", "Bob"),
  player("u3", "Cara"),
  player("u4", "Dev"),
];

/** u2 was the spy; u1 and u3 called it, u4 looked elsewhere. */
function revealedRoom(overrides: Partial<RoomState> = {}): RoomState {
  return baseRoomState({
    mode: "spy",
    phase: "finished",
    players: ROSTER,
    results: [
      {
        kind: "spy_round",
        index: 0,
        name: "Round one",
        items: ["a", "b", "c", "d"].map(item),
        picks: { u1: ["a"], u2: ["d"], u3: ["a"], u4: ["a"] },
      },
    ],
    endgame: {
      kind: "spy_reveal",
      spyUserId: "u2",
      hiddenByRound: [["b", "c", "d"]],
      scores: { u1: 1, u2: 1, u3: 1, u4: 0 },
    },
    myAccusation: "u2",
    ...overrides,
  });
}

function renderReveal(state: RoomState, currentUserId = "u1") {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SpyRevealScreen state={state} currentUserId={currentUserId} />
    </NextIntlClientProvider>,
  );
}

describe("SpyRevealScreen", () => {
  it("heads itself and offers a way out", () => {
    // The room header (with Leave) is gone once a game is finished, and the
    // nav rail comes back only because this phase asks for it. Without a title
    // and a link, a finished room was a page with neither.
    //
    // The h1 is the shared results HERO's — the same one solo play opens with,
    // which says the game is over rather than naming the pack again. The way
    // back to the pack moved into the aside's Play again panel with it.
    renderReveal(revealedRoom());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Here's what the room picked",
    );
    expect(screen.getByRole("link", { name: /back to pack/i })).toHaveAttribute(
      "href",
      "/packs/pack-1",
    );
  });

  it("names the spy", () => {
    renderReveal(revealedRoom());

    expect(screen.getByText("Bob was the spy")).toBeInTheDocument();
  });

  it("tells the spy it was them, and asks them nothing about their own call", () => {
    renderReveal(revealedRoom(), "u2");

    expect(screen.getByText("You were the spy")).toBeInTheDocument();
    // The spy never accused, so there is no call of theirs to grade.
    expect(screen.queryByText(/^You named/)).not.toBeInTheDocument();
  });

  it("grades the viewer's own call, and nobody else's", () => {
    renderReveal(revealedRoom());

    expect(screen.getByText("You named Bob")).toBeInTheDocument();
    expect(screen.getByText("Correct call")).toBeInTheDocument();
    // u4 was wrong, and that is between u4 and the server.
    expect(screen.queryByText("Wrong call")).not.toBeInTheDocument();
  });

  it("says the spy was caught when nobody missed them", () => {
    renderReveal(
      revealedRoom({
        endgame: {
          kind: "spy_reveal",
          spyUserId: "u2",
          hiddenByRound: [["b", "c", "d"]],
          scores: { u1: 1, u2: 0, u3: 1, u4: 1 },
        },
      }),
    );

    expect(screen.getByText("The room caught them")).toBeInTheDocument();
  });

  // The "what the spy could see" recap ("Saw 1 of 4") is deliberately gone.
  // It restated what the pick history already shows — a spy whose picks came
  // from one card is visible in the table itself — and sat where the
  // leaderboard now does.

  it("shows the whole pick history with the spy's column marked", () => {
    renderReveal(revealedRoom());

    const table = screen.getByLabelText("Every pick, every round");
    expect(table).toHaveTextContent("Alice");
    expect(table).toHaveTextContent("Bob");
    // Bob's round-one pick was one of the three he could not read.
    expect(table).toHaveTextContent("Title d");
  });
});
