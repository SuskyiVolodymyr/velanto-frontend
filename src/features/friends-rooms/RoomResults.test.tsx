import { screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomResults } from "./RoomResults";
import { baseRoomState } from "./test-fixtures";

// The results aside carries a Play again panel, which routes.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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

    // Scoped to the round's own card: the aside's Top picked board ranks the
    // same items, so an unscoped getByText now matches twice.
    const round = within(screen.getByRole("region", { name: "Round 1" }));
    expect(round.getByText("A")).toBeInTheDocument();
    expect(round.getByText("Pizza")).toBeInTheDocument();
    expect(round.getByText("B")).toBeInTheDocument();
    expect(round.getByText("Sushi")).toBeInTheDocument();
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

    /** The round's own matchup row — the aside's Top picked board ranks the
     * same items, so every assertion here is scoped to the recap. */
    function matchup() {
      return within(screen.getByRole("group", { name: /Round one/ }));
    }

    it("names what lost, not only what won", () => {
      render(<RoomResults state={voteState()} />);

      expect(matchup().getByText("Pizza")).toBeInTheDocument();
      expect(matchup().getByText("Sushi")).toBeInTheDocument();
    });

    it("says which one won, so the two are not just a list", () => {
      render(<RoomResults state={voteState()} />);

      // A mirrored pair rather than a list: the winner is the green card, and
      // the label is rendered on BOTH sides (hidden on the loser) so the two
      // titles sit on one baseline across the VS.
      const won = matchup().getByTestId("winner");
      expect(won).toHaveTextContent("Pizza");
      expect(won).toHaveTextContent("2");
      // The loser carries its own count too — "0 votes" is a real outcome.
      const lost = matchup().getByTestId("loser");
      expect(lost).toHaveTextContent("Sushi");
      expect(lost).toHaveTextContent("0");
    });
  });
});
