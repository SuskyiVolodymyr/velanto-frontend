import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SpyAccusationScreen } from "./SpyAccusationScreen";
import { baseRoomState } from "./test-fixtures";
import type { RoomPlayerState, RoomState } from "./room-types";

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

function accusingRoom(overrides: Partial<RoomState> = {}): RoomState {
  return baseRoomState({
    mode: "spy",
    phase: "guessing",
    iAmSpy: false,
    players: ROSTER,
    guessing: {
      labels: [],
      candidateUserIds: ROSTER.map((p) => p.userId),
      submitted: [],
    },
    results: [],
    ...overrides,
  });
}

function renderScreen(state: RoomState, onAccuse = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SpyAccusationScreen
        state={state}
        currentUserId="u1"
        onAccuse={onAccuse}
      />
    </NextIntlClientProvider>,
  );
  return onAccuse;
}

describe("SpyAccusationScreen", () => {
  it("offers everyone except yourself", () => {
    renderScreen(accusingRoom());

    expect(screen.getByRole("button", { name: "Accuse Bob" })).toBeEnabled();
    // You know you are not the spy, so naming yourself is not a move — and the
    // server refuses it anyway.
    expect(
      screen.queryByRole("button", { name: "Accuse Alice" }),
    ).not.toBeInTheDocument();
  });

  it("sends the accusation", async () => {
    const onAccuse = renderScreen(accusingRoom());

    await userEvent.click(screen.getByRole("button", { name: "Accuse Cara" }));

    expect(onAccuse).toHaveBeenCalledWith("u3");
  });

  it("tells the spy to sit it out, and offers them nobody to accuse", () => {
    renderScreen(accusingRoom({ iAmSpy: true }));

    expect(
      screen.getByText("You're the spy — sit tight while the room decides."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Accuse / }),
    ).not.toBeInTheDocument();
  });

  it("counts submissions against the accusers, never the whole room", () => {
    // Four seats, one of them the spy, who never submits — so a progress line
    // measured against the roster would stall one short in every game.
    renderScreen(
      accusingRoom({
        guessing: {
          labels: [],
          candidateUserIds: ROSTER.map((p) => p.userId),
          submitted: ["u2"],
        },
      }),
    );

    expect(screen.getByText("1 / 3 have accused")).toBeInTheDocument();
  });
});
