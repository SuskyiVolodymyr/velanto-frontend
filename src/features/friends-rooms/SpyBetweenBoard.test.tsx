import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import type { Item } from "@/src/shared/types/pack";
import { SpyBetweenBoard } from "./SpyBetweenBoard";
import { baseRoomState } from "./test-fixtures";
import type { RoomPlayerState, RoomState } from "./room-types";

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

function betweenRoom(overrides: Partial<RoomState> = {}): RoomState {
  return baseRoomState({
    mode: "spy",
    phase: "between",
    iAmSpy: true,
    players: [player("u1", "Alice"), player("u2", "Bob"), player("u3", "Cara")],
    results: [
      {
        kind: "spy_round",
        index: 0,
        name: "The prodigies",
        items: ["a", "b", "c"].map(item),
        picks: { u1: ["c"], u2: ["a"], u3: ["a"] },
      },
    ],
    ...overrides,
  });
}

function renderBoard(state: RoomState, onNext = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SpyBetweenBoard state={state} currentUserId="u1" onNext={onNext} />
    </NextIntlClientProvider>,
  );
  return onNext;
}

describe("SpyBetweenBoard", () => {
  it("renders the round that just closed rather than nothing at all", () => {
    // The whole bug this screen exists to fix: with no case for the mode the
    // room went blank for the full auto-next countdown.
    renderBoard(betweenRoom());

    expect(screen.getByText("Title a")).toBeInTheDocument();
    expect(screen.getByText("Title c")).toBeInTheDocument();
  });

  it("un-redacts the board once the round is over, even for the spy", () => {
    // A resolved round has no decision left in it, so the spy finally gets to
    // see what they were choosing between. This is the payoff beat.
    renderBoard(betweenRoom());

    expect(screen.queryByText("Redacted option")).not.toBeInTheDocument();
  });

  it("attributes every pick to its player", () => {
    renderBoard(betweenRoom());

    // Two took "a", one took "c" — the room reading itself back.
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Cara")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("moves the room on", async () => {
    const onNext = renderBoard(betweenRoom());

    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(onNext).toHaveBeenCalled();
  });
});
