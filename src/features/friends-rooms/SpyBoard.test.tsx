import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import type { Item } from "@/src/shared/types/pack";
import { SpyBoard } from "./SpyBoard";
import { baseRoomState } from "./test-fixtures";
import type { RoomState } from "./room-types";

function item(id: string): Item {
  return { id, type: "text", title: `Title ${id}`, value: `Title ${id}` };
}

/**
 * The spy's board and a hunter's differ ONLY in what the server sent: the spy
 * gets fewer `items` and tokens in their place inside `optionIds`. Nothing on
 * the client decides what to hide — these fixtures are the two shapes the
 * server actually produces.
 */
function spyRoom(overrides: Partial<RoomState> = {}): RoomState {
  return baseRoomState({
    mode: "spy",
    iAmSpy: true,
    round: {
      index: 0,
      name: "The prodigies",
      // Two of five readable; the rest arrive as tokens with no item.
      items: [item("a"), item("b")],
      claims: {},
      survivorItemId: null,
      optionIds: ["a", "b", "tok1", "tok2", "tok3"],
      actionKind: "pick",
      picks: {},
    },
    ...overrides,
  });
}

function hunterRoom(overrides: Partial<RoomState> = {}): RoomState {
  return baseRoomState({
    mode: "spy",
    iAmSpy: false,
    round: {
      index: 0,
      name: "The prodigies",
      items: ["a", "b", "c", "d", "e"].map(item),
      claims: {},
      survivorItemId: null,
      optionIds: ["a", "b", "c", "d", "e"],
      actionKind: "pick",
      picks: {},
    },
    ...overrides,
  });
}

function renderBoard(state: RoomState, onPick = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SpyBoard state={state} currentUserId="u1" onPick={onPick} />
    </NextIntlClientProvider>,
  );
  return onPick;
}

describe("SpyBoard", () => {
  it("renders one option per slot, including the ones the spy cannot read", () => {
    renderBoard(spyRoom());

    // Five options on a board carrying two items: the spy must know the SHAPE
    // of the round or others' picks cannot be attributed to a slot.
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("shows a redacted option as redacted, and never invents a title for it", () => {
    renderBoard(spyRoom());

    expect(screen.getAllByText("Redacted option")).toHaveLength(3);
    expect(screen.queryByText("Title c")).not.toBeInTheDocument();
  });

  it("lets the spy pick a redacted option blind, sending its token", async () => {
    const onPick = renderBoard(spyRoom());

    await userEvent.click(
      screen.getByRole("button", {
        name: "Pick the hidden option in slot 3",
      }),
    );

    // The token, not an item id — the server translates it back.
    expect(onPick).toHaveBeenCalledWith("tok1");
  });

  it("gives a hunter the full board with every title", () => {
    renderBoard(hunterRoom());

    expect(screen.getByText("Title c")).toBeInTheDocument();
    expect(screen.queryByText("Redacted option")).not.toBeInTheDocument();
  });

  it("tells the spy how much of the board is hidden from them", () => {
    renderBoard(spyRoom());

    expect(
      screen.getByText("3 of 5 options are hidden from you"),
    ).toBeInTheDocument();
  });

  it("tells a hunter there is a spy, without naming one", () => {
    renderBoard(hunterRoom());

    expect(screen.getByText("One of you is the spy")).toBeInTheDocument();
    // No redaction anywhere — the hunter's rule copy legitimately says the
    // words "hidden from you", so the badge is what proves nothing is masked.
    expect(screen.queryByText("HIDDEN FROM YOU")).not.toBeInTheDocument();
  });

  it("shows picks publicly, under real names", () => {
    renderBoard(
      hunterRoom({ round: { ...hunterRoom().round!, picks: { u2: ["c"] } } }),
    );

    // Bob's pick is attributed to Bob — the mode's whole social layer.
    expect(screen.getByLabelText("Picks so far")).toHaveTextContent("Bob");
  });

  // Spec §13 Amendment 1. The server no longer sends the spy anybody else's
  // pick — not even a tokenised one — so the tally would be a panel showing
  // only themselves under a heading that says "Picks so far". The board says
  // outright that it is hiding them, because silence reads as broken.
  it("tells the spy the room's picks are hidden from them, rather than showing an empty tally", () => {
    renderBoard(spyRoom({ round: { ...spyRoom().round!, picks: {} } }));

    expect(screen.queryByLabelText("Picks so far")).toBeNull();
    expect(
      screen.getByLabelText("The room's picks are hidden from you"),
    ).toBeInTheDocument();
  });

  // "1 of 4 picks in" would be a claim about the ROOM built from a number that
  // now only ever counts the spy themselves.
  it("never counts the room's picks for the spy", () => {
    renderBoard(
      spyRoom({ round: { ...spyRoom().round!, picks: { u1: ["a"] } } }),
    );

    expect(screen.queryByText(/picks in/)).toBeNull();
  });

  it("still shows a hunter the tally, which is unchanged", () => {
    renderBoard(
      hunterRoom({ round: { ...hunterRoom().round!, picks: { u2: ["c"] } } }),
    );

    expect(screen.getByLabelText("Picks so far")).toHaveTextContent("Bob");
  });
});
