import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomBetweenBoard } from "./RoomBetweenBoard";
import { baseRoomState } from "./test-fixtures";

describe("RoomBetweenBoard", () => {
  it("mode claim renders the survivor board (RoomBetween)", () => {
    render(
      <RoomBetweenBoard
        state={baseRoomState({
          mode: "claim",
          round: {
            index: 0,
            name: "",
            items: [{ id: "i1", title: "Item 1", type: "text", value: "Item 1" }],
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
