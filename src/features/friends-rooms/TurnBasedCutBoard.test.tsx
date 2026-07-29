import { screen } from "@testing-library/react";
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
    // TurnBasedCutBoard reuses RoomItemCard's existing claim-button semantics
    // (Task 9's save/sacrifice verb pair) rather than inventing a third "cut"
    // verb on that shared component — save_one/sacrifice_one is the only
    // format pair this mode is offered on (ROOM_MODE_BOUNDS), so its default
    // "sacrifice_one" framing applies here too.
    await userEvent.click(screen.getByRole("button", { name: /sacrifice a/i }));
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
      screen.queryByRole("button", { name: /sacrifice a/i }),
    ).not.toBeInTheDocument();
  });

  it("an already-cut item renders with sacrificed status, not as a live option", () => {
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
    expect(screen.getByText(/sacrificed by bob/i)).toBeInTheDocument();
  });
});
