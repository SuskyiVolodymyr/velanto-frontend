import { screen, within } from "@testing-library/react";
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
    // Scoped to the table: the labels also ride the closed round's cards now,
    // so a bare getByText would match twice.
    const history = screen.getByRole("table");
    expect(within(history).getByText("P1")).toBeInTheDocument();
    expect(within(history).getByText("P2")).toBeInTheDocument();
  });

  // The round closed on a table of titles, so you never saw the choice ON the
  // item you had just been looking at. The brief's mechanic is that each
  // anonymous label's pick is revealed once everyone is locked in and the
  // labels accumulate into readable trajectories — so the mark is the LABEL,
  // not a faceless count. A single round still attributes nothing (two people
  // pick the same option); the column across rounds is what identifies anyone.
  it("marks the closed round's own cards with the label that picked each", () => {
    render(
      <GuessWhoRevealBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "Round 1",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "reveal",
              index: 0,
              name: "Round 1",
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              picks: { P1: ["i1"], P2: ["i1"], P3: ["i2"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={() => {}}
      />,
    );

    // P1 and P2 both took Pizza; P3 took Sushi.
    const pizza = screen.getByRole("group", { name: "Pizza" });
    expect(within(pizza).getByText("P1")).toBeInTheDocument();
    expect(within(pizza).getByText("P2")).toBeInTheDocument();
    expect(within(pizza).queryByText("P3")).toBeNull();

    const sushi = screen.getByRole("group", { name: "Sushi" });
    expect(within(sushi).getByText("P3")).toBeInTheDocument();
  });
});
