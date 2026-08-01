import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomBetweenBoard } from "./RoomBetweenBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("RoomBetweenBoard", () => {
  it("mode claim renders the survivor board (RoomBetween)", () => {
    render(
      <RoomBetweenBoard
        state={baseRoomState({
          mode: "claim",
          round: {
            index: 0,
            name: "",
            items: [
              { id: "i1", title: "Item 1", type: "text", value: "Item 1" },
            ],
            claims: {},
            survivorItemId: "i1",
          },
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/survivor/i).length).toBeGreaterThan(0);
  });

  // Guess-who's between beat is the round's own cards with the labels landed
  // on them, not a chronology table — the history lives on the results screen.
  it("mode guess_who renders the closed round's marked cards", () => {
    render(
      <RoomBetweenBoard
        state={baseRoomState({
          mode: "guess_who",
          results: [
            {
              kind: "reveal",
              index: 0,
              name: "Round 1",
              items: [
                { id: "i1", title: "Pizza", type: "text", value: "Pizza" },
              ],
              picks: { P1: ["i1"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("P1")).toBeInTheDocument();
  });

  it("mode turn_based_cut with a cuts history renders it as an ordered strip", () => {
    render(
      <RoomBetweenBoard
        state={baseRoomState({
          mode: "turn_based_cut",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
            claims: {},
            survivorItemId: "i3",
            cuts: [
              { userId: "u1", itemId: "i1" },
              { userId: "u2", itemId: "i2" },
            ],
          },
        })}
        currentUserId="u1"
        packFormat="sacrifice_one"
        onNext={vi.fn()}
      />,
    );
    const history = screen.getByLabelText(/cut order/i);
    expect(history).toHaveTextContent("Alice");
    expect(history).toHaveTextContent("Bob");
  });

  it("mode null renders nothing (defensive — between should never resolve with no mode)", () => {
    const { container } = render(
      <RoomBetweenBoard
        state={baseRoomState({ mode: null })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
