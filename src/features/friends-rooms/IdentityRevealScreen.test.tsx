import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { IdentityRevealScreen } from "./IdentityRevealScreen";
import { baseRoomState } from "./test-fixtures";

describe("IdentityRevealScreen", () => {
  it("marks each of MY guesses green (correct) or red (wrong) against the true mapping", () => {
    render(
      <IdentityRevealScreen
        state={baseRoomState({
          phase: "finished",
          mode: "guess_who",
          endgame: { kind: "identity_reveal", mapping: { P1: "u1", P2: "u2" } },
          myGuess: { P1: "u1", P2: "u1" },
        })}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("P1");
    expect(rows[0].className).toMatch(/live|success/);
    expect(rows[1]).toHaveTextContent("P2");
    expect(rows[1].className).toMatch(/danger/);
  });

  it("renders a note (not a crash) when the score-per-player data isn't on the wire", () => {
    render(
      <IdentityRevealScreen
        state={baseRoomState({
          phase: "finished",
          mode: "guess_who",
          endgame: { kind: "identity_reveal", mapping: { P1: "u1" } },
          myGuess: { P1: "u1" },
        })}
      />,
    );
    expect(screen.getByText(/scores available once/i)).toBeInTheDocument();
  });
});
