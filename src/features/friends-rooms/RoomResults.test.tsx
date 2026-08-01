import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomResults } from "./RoomResults";
import { baseRoomState } from "./test-fixtures";

const ITEMS = [
  { id: "i1", title: "Pizza", type: "text" as const, value: "Pizza" },
  { id: "i2", title: "Sushi", type: "text" as const, value: "Sushi" },
];

describe("RoomResults", () => {
  /**
   * Guess-who normally routes its finished phase to IdentityRevealScreen, but
   * only when `endgame` is populated — a reconnect into a finished room
   * before `identity.revealed` falls through to RoomResults instead. Without
   * a `reveal` arm those rounds rendered as a bordered box holding nothing
   * but the round name.
   */
  it("renders a reveal round's per-label picks rather than an empty block", () => {
    render(
      <RoomResults
        state={baseRoomState({
          mode: "guess_who",
          phase: "finished",
          results: [
            {
              kind: "reveal",
              index: 0,
              name: "Round one",
              items: ITEMS,
              picks: { A: ["i1"], B: ["i2"] },
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("Sushi")).toBeInTheDocument();
  });

  // A vote round named only its winner, so the results screen never said what
  // it beat — on a 1v1 pack, whose whole round is one item against another,
  // that is half the outcome missing.
  describe("a vote round", () => {
    function voteState() {
      return baseRoomState({
        mode: "voting",
        packFormat: "1v1",
        phase: "finished",
        results: [
          {
            kind: "vote",
            index: 0,
            name: "Round one",
            items: ITEMS,
            optionIds: ["i1", "i2"],
            votes: { u1: "i1", u2: "i1" },
            tally: { i1: 2, i2: 0 },
            winnerOptionId: "i1",
            tieBroken: false,
            priorityUserId: "u1",
          },
        ],
      });
    }

    it("names what lost, not only what won", () => {
      render(<RoomResults state={voteState()} />);

      expect(screen.getByText("Pizza")).toBeInTheDocument();
      expect(screen.getByText("Sushi")).toBeInTheDocument();
    });

    it("says which one won, so the two are not just a list", () => {
      render(<RoomResults state={voteState()} />);

      const won = screen.getByRole("listitem", { name: /pizza/i });
      expect(won).toHaveTextContent("2");
      // The loser carries its own count too — "0 votes" is a real outcome.
      expect(
        screen.getByRole("listitem", { name: /sushi/i }),
      ).toHaveTextContent("0");
    });
  });
});
