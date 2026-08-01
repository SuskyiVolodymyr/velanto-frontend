import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { RelayBetweenBoard } from "./RelayBetweenBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("RelayBetweenBoard", () => {
  it("shows the final shared order and the placement history", () => {
    render(
      <RelayBetweenBoard
        state={baseRoomState({
          mode: "relay",
          phase: "between",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "relay",
              index: 0,
              name: "",
              items: [ITEM("i1", "A"), ITEM("i2", "B")],
              order: ["i2", "i1"],
              placements: [
                { userId: "u1", itemId: "i2" },
                { userId: "u2", itemId: "i1" },
              ],
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );
    const list = screen.getByRole("list", { name: /final order/i });
    expect(list).toHaveTextContent("B");
    expect(list).toHaveTextContent("A");
    expect(screen.getByLabelText(/placement history/i)).toHaveTextContent(
      "Alice",
    );
  });
});
