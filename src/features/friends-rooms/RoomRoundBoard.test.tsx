import { screen } from "@testing-library/react";
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
