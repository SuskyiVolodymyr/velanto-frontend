import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { TurnBasedCutBoard } from "./TurnBasedCutBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("TurnBasedCutBoard", () => {
  it("on your turn, clicking a remaining item calls onCut", async () => {
    const onCut = vi.fn();
    render(
      <TurnBasedCutBoard
        state={baseRoomState({
          mode: "turn_based_cut",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            remainingItemIds: ["i1", "i2"],
            turnUserId: "u1",
            cuts: [],
          },
        })}
        currentUserId="u1"
        onCut={onCut}
      />,
    );
    // The board says "cut" now, not "sacrifice": it renders RoundItemTile,
    // which is mode-agnostic, rather than RoomItemCard's save/sacrifice pair.
    // Cutting is not claiming, and calling it a sacrifice only made sense
    // while this mode was borrowing Claim's card.
    await userEvent.click(screen.getByRole("button", { name: "Cut A" }));
    expect(onCut).toHaveBeenCalledWith("i1");
  });

  it("when it isn't your turn, the board renders but items aren't buttons", () => {
    render(
      <TurnBasedCutBoard
        state={baseRoomState({
          mode: "turn_based_cut",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            remainingItemIds: ["i1", "i2"],
            turnUserId: "u2",
            cuts: [],
          },
        })}
        currentUserId="u1"
        onCut={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Cut A" }),
    ).not.toBeInTheDocument();
  });

  it("strikes a cut item out and logs who cut it", () => {
    render(
      <TurnBasedCutBoard
        state={baseRoomState({
          mode: "turn_based_cut",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            remainingItemIds: ["i2"],
            turnUserId: "u1",
            cuts: [{ userId: "u2", itemId: "i1" }],
          },
        })}
        currentUserId="u1"
        onCut={vi.fn()}
      />,
    );
    // The cut item is out of play: struck through and no longer a control.
    // "A" reads twice — the tile and the aside's log — so scope to the board.
    const board = screen.getByRole("region", { name: "Cut so far" });
    const tileName = screen
      .getAllByText("A")
      .find((el) => !board.contains(el))!;
    expect(tileName).toHaveClass("line-through");
    expect(
      screen.queryByRole("button", { name: "Cut A" }),
    ).not.toBeInTheDocument();
    // ...and the aside says who did it, which the board itself no longer
    // spells out on the tile.
    expect(within(board).getByText("A")).toBeInTheDocument();
  });

  it("names the first cutter while the board is untouched", () => {
    render(
      <TurnBasedCutBoard
        state={baseRoomState({
          mode: "turn_based_cut",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            remainingItemIds: ["i1", "i2"],
            turnUserId: "u2",
            cuts: [],
          },
        })}
        currentUserId="u1"
        onCut={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Nothing cut yet — Bob goes first."),
    ).toBeInTheDocument();
  });
});
