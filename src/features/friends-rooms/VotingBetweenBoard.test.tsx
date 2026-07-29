import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { VotingBetweenBoard } from "./VotingBetweenBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("VotingBetweenBoard", () => {
  it("shows the winning option and, when tieBroken, explains the priority tiebreak", () => {
    render(
      <VotingBetweenBoard
        state={baseRoomState({
          mode: "voting",
          phase: "between",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "vote",
              index: 0,
              name: "",
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              optionIds: ["i1", "i2"],
              votes: { u1: "i1", u2: "i2" },
              tally: { i1: 1, i2: 1 },
              winnerOptionId: "i1",
              tieBroken: true,
              priorityUserId: "u1",
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText(/tie.*alice/i)).toBeInTheDocument();
  });
});
