import { screen } from "@testing-library/react";
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
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText(/tied/i)).toBeInTheDocument();
  });
});
