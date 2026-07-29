import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RoomRoundBoard } from "./RoomRoundBoard";
import { baseRoomState } from "./test-fixtures";

describe("RoomRoundBoard", () => {
  it("mode claim renders the claim board (RoomRound)", () => {
    render(
      <RoomRoundBoard
        state={baseRoomState({
          mode: "claim",
          round: {
            index: 0,
            name: "",
            items: [{ id: "i1", title: "Item 1", type: "text", value: "Item 1" }],
            claims: {},
            survivorItemId: null,
          },
        })}
        currentUserId="u1"
        actions={{} as never}
      />,
    );
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("mode null renders nothing (defensive — a round should never start with no mode)", () => {
    const { container } = render(
      <RoomRoundBoard
        state={baseRoomState({ mode: null })}
        currentUserId="u1"
        actions={{} as never}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
