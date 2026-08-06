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
  it("shows the pick history — it is what the accusation is read from", () => {
    // This screen shipped with an empty left column because the results the
    // table reads never arrived (roundResultFromResolved had no spy case), so
    // the accusation panel sat alone with nothing to reason about.
    renderScreen(
      accusingRoom({
        results: [
          {
            kind: "spy_round",
            index: 0,
            name: "Round one",
            items: [
              { id: "a", type: "text", title: "Title a", value: "Title a" },
              { id: "b", type: "text", title: "Title b", value: "Title b" },
            ],
            picks: { u1: ["a"], u2: ["b"], u3: ["a"], u4: ["a"] },
          },
        ],
      }),
    );

    const table = screen.getByLabelText("Every pick, every round");
    expect(table).toHaveTextContent("Title a");
    expect(table).toHaveTextContent("Title b");
    expect(table).toHaveTextContent("Bob");
  });

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

    // Two steps, not one: naming someone moves them into the centre panel,
    // and only Confirm sends it. An accusation is the one irreversible move in
    // the mode, and a single mis-click used to be the whole of it.
    await userEvent.click(screen.getByRole("button", { name: "Accuse Cara" }));
    expect(onAccuse).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "Confirm accusation" }),
    );

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
