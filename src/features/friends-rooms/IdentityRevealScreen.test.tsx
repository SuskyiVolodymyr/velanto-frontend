import { screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { IdentityRevealScreen } from "./IdentityRevealScreen";
import { baseRoomState } from "./test-fixtures";

function revealState(overrides: Record<string, unknown> = {}) {
  return baseRoomState({
    phase: "finished",
    mode: "guess_who",
    endgame: { kind: "identity_reveal", mapping: { P1: "u1", P2: "u2" } },
    myGuess: { P1: "u1", P2: "u1" },
    ...overrides,
  });
}

describe("IdentityRevealScreen", () => {
  it("marks each of MY guesses green (correct) or red (wrong) against the true mapping", () => {
    render(<IdentityRevealScreen state={revealState()} />);

    const mine = within(screen.getByRole("region", { name: "Your guess" }));
    const rows = mine.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("P1");
    expect(rows[0].className).toMatch(/live|success/);
    expect(rows[1]).toHaveTextContent("P2");
    expect(rows[1].className).toMatch(/danger/);
    // A wrong row says who you actually named, not just that you were wrong.
    expect(mine.getByText("You said Alice")).toBeInTheDocument();
  });

  // The leaderboard is public — every score is derived from the mapping that
  // has just been shown to everyone. It replaced a placeholder note that stood
  // in while the wire carried no scores at all.
  it("ranks every player and crowns the top score", () => {
    render(
      <IdentityRevealScreen
        state={revealState({
          endgame: {
            kind: "identity_reveal",
            mapping: { P1: "u1", P2: "u2" },
            scores: { u1: 2, u2: 1 },
          },
        })}
      />,
    );

    const board = within(screen.getByRole("region", { name: "Leaderboard" }));
    const rows = board.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Alice");
    expect(rows[0]).toHaveTextContent("2");
    expect(rows[1]).toHaveTextContent("Bob");

    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(
      screen.getByText("Read the room best — 2 of 2 labels matched"),
    ).toBeInTheDocument();
  });

  // No tiebreak exists in this mode, so crowning whoever sorts first would
  // invent one. A shared top score is a shared win.
  it("names every winner when the top score is tied, and crowns nobody", () => {
    render(
      <IdentityRevealScreen
        state={revealState({
          endgame: {
            kind: "identity_reveal",
            mapping: { P1: "u1", P2: "u2" },
            scores: { u1: 1, u2: 1 },
          },
        })}
      />,
    );

    expect(screen.getByText(/Shared win/)).toBeInTheDocument();
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
  });

  // Absent scores mean the game ended without a reveal, not zero for everyone
  // — so the board is omitted rather than drawn empty.
  it("omits the leaderboard when no scores came through", () => {
    render(<IdentityRevealScreen state={revealState()} />);

    expect(
      screen.queryByRole("region", { name: "Leaderboard" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
  });
});
