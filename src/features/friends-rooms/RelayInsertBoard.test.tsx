import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RelayInsertBoard } from "./RelayInsertBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("RelayInsertBoard", () => {
  it("on your turn, renders one more gap than placed items, and clicking a gap places the current item there", async () => {
    const onPlaceItem = vi.fn();
    render(
      <RelayInsertBoard
        state={baseRoomState({
          mode: "relay",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B"), ITEM("i3", "C")],
            claims: {},
            survivorItemId: null,
            relayOrder: ["i1", "i2", "i3"],
            relayPlaced: ["i1"],
            relayCurrentItemId: "i2",
            relayPlacements: [{ userId: "u1", itemId: "i1" }],
            turnUserId: "u1",
          },
        })}
        currentUserId="u1"
        onPlaceItem={onPlaceItem}
      />,
    );
    // one placed item ("A") -> two gaps: before it, after it. Each gap must
    // carry its OWN accessible name — a shared "Insert here" leaves them
    // indistinguishable to screen-reader and voice-control users.
    const gaps = screen.getAllByRole("button", { name: /insert/i });
    expect(gaps).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /insert before a/i }),
    ).toBeInTheDocument();
    const atEnd = screen.getByRole("button", { name: /insert at the end/i });
    await userEvent.click(atEnd);
    expect(onPlaceItem).toHaveBeenCalledWith("i2", 1);
  });

  it("when it isn't your turn, gaps are not rendered as buttons", () => {
    render(
      <RelayInsertBoard
        state={baseRoomState({
          mode: "relay",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A")],
            claims: {},
            survivorItemId: null,
            relayOrder: ["i1"],
            relayPlaced: [],
            relayCurrentItemId: "i1",
            relayPlacements: [],
            turnUserId: "u2",
          },
        })}
        currentUserId="u1"
        onPlaceItem={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /insert/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the current item awaiting placement", () => {
    render(
      <RelayInsertBoard
        state={baseRoomState({
          mode: "relay",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            relayOrder: ["i1", "i2"],
            relayPlaced: [],
            relayCurrentItemId: "i1",
            relayPlacements: [],
            turnUserId: "u1",
          },
        })}
        currentUserId="u1"
        onPlaceItem={vi.fn()}
      />,
    );
    // getAllByText, not getByText: the turn-holder's UserAvatar fallback
    // initial ("A" for Alice) and this item's own title ("A") coincide.
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
  });
});
