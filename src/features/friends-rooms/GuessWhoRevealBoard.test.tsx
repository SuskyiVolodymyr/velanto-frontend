import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessWhoRevealBoard } from "./GuessWhoRevealBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("GuessWhoRevealBoard", () => {
  it("shows this round's fresh reveal — every label's pick, resolved to the item title", () => {
    render(
      <GuessWhoRevealBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 1,
            name: "Round 2",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "reveal",
              index: 0,
              name: "Round 1",
              items: [ITEM("i3", "Tacos")],
              picks: { P1: ["i3"], P2: ["i3"] },
            },
            {
              kind: "reveal",
              index: 1,
              name: "Round 2",
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              picks: { P1: ["i1"], P2: ["i2"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={() => {}}
      />,
    );
    // The history table renders both rounds, with each label's choice resolved
    // to a title, never a raw item id.
    expect(screen.getAllByText("Pizza").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tacos").length).toBeGreaterThan(0);
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("P2")).toBeInTheDocument();
  });
});
