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
});
