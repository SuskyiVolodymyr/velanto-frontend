import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomRoundBoard } from "./RoomRoundBoard";
import { baseRoomState } from "./test-fixtures";

function claimRoundState() {
  return baseRoomState({
    mode: "claim",
    round: {
      index: 0,
      name: "",
      items: [{ id: "i1", title: "Item 1", type: "text", value: "Item 1" }],
      claims: {},
      survivorItemId: null,
    },
  });
}

// Claim's mechanic does not flip with the pack's format: the engine has every
// player claim one item TO SACRIFICE and the single unclaimed item survive
// (claim.engine.ts). A save_one pack does not invert that — its saved item is
// the survivor — so the chrome must not offer a save_one room a save.
describe("RoomRoundBoard — a claim is a sacrifice in both formats", () => {
  it.each(["save_one", "sacrifice_one"] as const)(
    "asks a %s room what to give up",
    (packFormat) => {
      render(
        <RoomRoundBoard
          state={{ ...claimRoundState(), packFormat }}
          currentUserId="u1"
          actions={{} as never}
        />,
      );

      expect(
        screen.getByText(
          "Claim one item to sacrifice. The item nobody claims survives.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Take the one you want out")).toBeInTheDocument();
    },
  );
});

describe("RoomRoundBoard", () => {
  it("mode claim renders the claim board (RoomRound)", () => {
    render(
      <RoomRoundBoard
        state={baseRoomState({
          mode: "claim",
          round: {
            index: 0,
            name: "",
            items: [
              { id: "i1", title: "Item 1", type: "text", value: "Item 1" },
            ],
            claims: {},
            survivorItemId: null,
          },
        })}
        currentUserId="u1"
        actions={{} as never}
      />,
    );
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("mode guess_who renders the guess-who pick board", () => {
    render(
      <RoomRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [{ id: "i1", title: "Pizza", type: "text", value: "Pizza" }],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1"],
            actionKind: "pick",
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        actions={{ pick: vi.fn() } as never}
      />,
    );
    expect(screen.getByText("Pizza")).toBeInTheDocument();
  });

  it("mode voting renders the voting board", () => {
    render(
      <RoomRoundBoard
        state={baseRoomState({
          mode: "voting",
          round: {
            index: 0,
            name: "",
            items: [{ id: "i1", title: "Pizza", type: "text", value: "Pizza" }],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1"],
            votes: {},
            priorityUserId: "u1",
          },
        })}
        currentUserId="u1"
        actions={{ vote: vi.fn() } as never}
      />,
    );
    expect(screen.getByText("Pizza")).toBeInTheDocument();
  });

  it("mode null renders nothing (defensive — a round should never start with no mode)", () => {
    const { container } = render(
      <RoomRoundBoard
        state={baseRoomState({ mode: null })}
        currentUserId="u1"
        actions={{} as never}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

// Guess-who's players play as X / Y / Z, and working out which is which is the
// whole mode. A room panel listing everyone by name breaks that fiction on the
// first screen: you are told there are three real people here, and separately
// shown three labels, with nothing tying the two together and no reason to
// wonder. Names come back at the reveal.
describe("RoomRoundBoard — guess-who masks the room", () => {
  function guessWhoState() {
    return baseRoomState({
      mode: "guess_who",
      labels: ["P1", "P2", "P3"],
      // Labels deliberately not in seat order — they are shuffled against the
      // roster at game start, and the panel must read each player's own.
      players: [
        { userId: "u1", username: "Volodka", label: "P2" },
        { userId: "u2", username: "test_user1", label: "P1" },
        { userId: "u3", username: "test_user2", label: "P3" },
      ].map((p, i) => ({
        ...p,
        avatarKey: null,
        seat: i,
        connected: true,
        ready: true,
        next: false,
        claimedItemId: null,
      })),
      round: {
        index: 0,
        name: "",
        items: [{ id: "i1", title: "Pizza", type: "text", value: "Pizza" }],
        claims: {},
        survivorItemId: null,
        optionIds: ["i1"],
        actionKind: "pick",
        lockedIn: ["u1"],
      },
    });
  }

  it("swaps every avatar and name for the label, keeping the status rows", () => {
    render(
      <RoomRoundBoard
        state={guessWhoState()}
        currentUserId="u1"
        actions={{ pick: vi.fn() } as never}
      />,
    );

    const room = screen.getByRole("region", { name: "Room" });
    // Twice each: the letter stands in for the avatar AND for the name, the
    // two things a row uses to say who someone is.
    for (const label of ["P1", "P2", "P3"]) {
      expect(within(room).getAllByText(label)).toHaveLength(2);
    }
    for (const name of ["Volodka", "test_user1", "test_user2"]) {
      expect(within(room).queryByText(name)).toBeNull();
    }
    // The old rows survive intact: one per player, each still saying where
    // they are up to. Only the avatar and the name are masked.
    expect(within(room).getByText("Locked in")).toBeInTheDocument();
    expect(within(room).getAllByText("Deciding…")).toHaveLength(2);
  });

  // You know which label is yours anyway — you can read your own picks off the
  // reveal — so hiding it from you buys nothing and costs you the ability to
  // follow your own column.
  it("tells the viewer which label is theirs", () => {
    render(
      <RoomRoundBoard
        state={guessWhoState()}
        currentUserId="u1"
        actions={{ pick: vi.fn() } as never}
      />,
    );

    const room = screen.getByRole("region", { name: "Room" });
    expect(within(room).getByText("You")).toBeInTheDocument();
  });
});

// nxn is the one format whose options are pools. Both modes it offers rendered
// two ids they could resolve to nothing: voting showed raw uuids, and guess-who
// (once its tiles required a real item) showed an empty board.
describe("RoomRoundBoard — nxn rounds pick a side", () => {
  function nxnState(mode: "guess_who" | "voting") {
    return baseRoomState({
      mode,
      packFormat: "nxn",
      round: {
        index: 0,
        name: "FLOW",
        items: [
          { id: "i1", title: "Radwimps", type: "text", value: "Radwimps" },
          { id: "i2", title: "Yorushika", type: "text", value: "Yorushika" },
        ],
        claims: {},
        survivorItemId: null,
        optionIds: ["ca", "cb"],
        actionKind: "pick",
        lockedIn: [],
        votes: {},
        priorityUserId: "u1",
        sides: [
          { id: "ca", name: "Side A", itemIds: ["i1"] },
          { id: "cb", name: "Side B", itemIds: ["i2"] },
        ],
      },
    });
  }

  it.each(["guess_who", "voting"] as const)(
    "renders %s's sides, named, with their own items",
    (mode) => {
      render(
        <RoomRoundBoard
          state={nxnState(mode)}
          currentUserId="u1"
          actions={{ pick: vi.fn(), vote: vi.fn() } as never}
        />,
      );

      expect(screen.getByText("Side A")).toBeInTheDocument();
      expect(screen.getByText("Side B")).toBeInTheDocument();
      expect(screen.getByText("Radwimps")).toBeInTheDocument();
      expect(screen.getByText("Yorushika")).toBeInTheDocument();
      // The option ids themselves are never shown — they are pool uuids.
      expect(screen.queryByText("ca")).toBeNull();
    },
  );

  it("sends the SIDE id, not an item id, when picked", async () => {
    const pick = vi.fn();
    render(
      <RoomRoundBoard
        state={nxnState("guess_who")}
        currentUserId="u1"
        actions={{ pick } as never}
      />,
    );

    // The aria-label names the side; the visible text is the generic verb.
    await userEvent.click(screen.getByRole("button", { name: "Pick Side A" }));
    expect(pick).toHaveBeenCalledWith(["ca"]);
  });
});

describe("RoomRoundBoard — claim rejection feedback", () => {
  it("shows a distinct 'slow down' note for a too_fast rejection, not the generic taken flash", () => {
    render(
      <RoomRoundBoard
        state={claimRoundState()}
        currentUserId="u1"
        actions={
          {
            claim: vi.fn(),
            lastRejection: { itemId: "i1", reason: "too_fast", claims: {} },
          } as never
        }
      />,
    );
    expect(screen.getByText(/wait a moment/i)).toBeInTheDocument();
  });

  it("shows no 'slow down' note for a plain taken rejection", () => {
    render(
      <RoomRoundBoard
        state={claimRoundState()}
        currentUserId="u1"
        actions={
          {
            claim: vi.fn(),
            lastRejection: { itemId: "i1", reason: "taken", claims: {} },
          } as never
        }
      />,
    );
    expect(screen.queryByText(/wait a moment/i)).not.toBeInTheDocument();
  });
});

describe("RoomRoundBoard — mode rejection feedback", () => {
  function cutRoundState() {
    return baseRoomState({
      mode: "turn_based_cut",
      round: {
        index: 0,
        name: "",
        items: [{ id: "i1", title: "Item 1", type: "text", value: "Item 1" }],
        claims: {},
        survivorItemId: null,
        remainingItemIds: ["i1"],
        turnUserId: "u2",
        cuts: [],
      },
    });
  }

  // Every non-Claim rejection used to reach state and be rendered by nobody:
  // you clicked, the server refused, and the board looked identical either
  // way. The worst case was Shared-grid, whose rank board auto-submits and
  // then disables every button.
  it("surfaces a rejected mode action as an alert", () => {
    render(
      <RoomRoundBoard
        state={cutRoundState()}
        currentUserId="u1"
        actions={
          {
            cut: vi.fn(),
            modeRejectionSeq: 1,
            lastModeRejection: {
              kind: "cut",
              itemId: "i1",
              reason: "not_your_turn",
              turnUserId: "u2",
            },
          } as never
        }
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/not your turn/i);
  });

  it("renders no alert when nothing has been rejected", () => {
    render(
      <RoomRoundBoard
        state={cutRoundState()}
        currentUserId="u1"
        actions={
          {
            cut: vi.fn(),
            modeRejectionSeq: 0,
            lastModeRejection: null,
          } as never
        }
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
