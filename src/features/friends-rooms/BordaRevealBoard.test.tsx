import { screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { BordaRevealBoard } from "./BordaRevealBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("BordaRevealBoard", () => {
  it("renders each tier as a rank row, and a two-item tier shares one rank number with a tie note", () => {
    render(
      <BordaRevealBoard
        state={baseRoomState({
          mode: "shared_grid",
          phase: "between",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "borda",
              index: 0,
              name: "",
              items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
              scores: { i1: 5, i2: 5, i3: 2 },
              order: [["i1", "i2"], ["i3"]],
              ballots: { u1: ["i1", "i2", "i3"], u2: ["i2", "i1", "i3"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );
    // Asserted per row, not by text: a first-choice voter's avatar rides the
    // row and Alice's fallback initial is also "A".
    const ranking = within(
      screen.getByRole("region", { name: "The group's ranking" }),
    );
    const rows = ranking.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    // The tied pair shares rank 1 and says so.
    expect(rows[0]).toHaveTextContent("1");
    expect(rows[0]).toHaveTextContent("A");
    expect(rows[0]).toHaveTextContent("B");
    expect(rows[0]).toHaveTextContent(/tied/i);
    // ...so the next rank is 3, not 2.
    expect(rows[1]).toHaveTextContent("3");
    expect(rows[1]).toHaveTextContent("C");
  });

  // Shared-grid has no winner, so the aside answers "whose taste matched the
  // room" instead of scoring anyone. It is derived from the ballots already on
  // the wire — no backend field behind it.
  it("shows how closely each player's ballot matched the group order", () => {
    render(
      <BordaRevealBoard
        state={baseRoomState({
          mode: "shared_grid",
          phase: "between",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "borda",
              index: 0,
              name: "",
              items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
              scores: { i1: 6, i2: 4, i3: 2 },
              order: [["i1"], ["i2"], ["i3"]],
              // Alice ranked exactly the group order; Bob reversed it.
              ballots: { u1: ["i1", "i2", "i3"], u2: ["i3", "i2", "i1"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );

    const panel = within(screen.getByRole("region", { name: "Alignment" }));
    expect(panel.getByText("100%")).toBeInTheDocument();
    expect(panel.getByText("0%")).toBeInTheDocument();
    // Best match leads.
    const rows = panel.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Alice");
    expect(rows[1]).toHaveTextContent("Bob");
  });
});
