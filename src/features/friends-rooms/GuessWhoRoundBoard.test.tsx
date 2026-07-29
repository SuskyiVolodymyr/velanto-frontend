import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessWhoRoundBoard } from "./GuessWhoRoundBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("GuessWhoRoundBoard", () => {
  it("pick mode: clicking an option locks it in and calls onPick once", async () => {
    const onPick = vi.fn();
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "pick",
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onPick={onPick}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /pizza/i }));
    expect(onPick).toHaveBeenCalledWith(["i1"]);
  });

  it("pick mode: the clicked option shows as selected WITHOUT any myLastSelection prop", async () => {
    // Regression guard: the real dispatcher (RoomRoundBoard) never passes
    // `myLastSelection`, so a test that supplies it cannot prove the player
    // sees anything happen when they click. Nothing is passed here on
    // purpose — this is the actual production wiring.
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "pick",
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onPick={vi.fn()}
      />,
    );
    const pizza = screen.getByRole("button", { name: /pizza/i });
    expect(pizza).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(pizza);
    expect(pizza).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /sushi/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("pick mode: once locked in, the board shows YOUR pick highlighted and stops taking further clicks", async () => {
    const onPick = vi.fn();
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "pick",
            lockedIn: ["u1"],
          },
        })}
        currentUserId="u1"
        myLastSelection={["i1"]}
        onPick={onPick}
      />,
    );
    expect(screen.getByRole("button", { name: /pizza/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("rank mode: clicking items one at a time builds a full ranking and submits when the last item is placed", async () => {
    const onPick = vi.fn();
    render(
      <GuessWhoRoundBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            actionKind: "rank",
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onPick={onPick}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /pizza/i }));
    await userEvent.click(screen.getByRole("button", { name: /sushi/i }));
    expect(onPick).toHaveBeenLastCalledWith(["i1", "i2"]);
  });
});
