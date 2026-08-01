import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { BlindRankBoard } from "./BlindRankBoard";
import type { Item } from "@/src/shared/types/pack";

const YOUTUBE_ITEM: Item = {
  id: "y1",
  title: "Silhouette",
  type: "youtube",
  value: "https://youtu.be/zVgKnfN9i34?t=44",
};
const SECOND: Item = {
  id: "t1",
  title: "Sushi",
  type: "text",
  value: "Sushi",
};

function renderBoard(overrides: { disabled?: boolean } = {}) {
  const onSubmit = vi.fn();
  render(
    <BlindRankBoard
      optionIds={["y1", "t1"]}
      itemsById={new Map([YOUTUBE_ITEM, SECOND].map((i) => [i.id, i]))}
      disabled={overrides.disabled ?? false}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

const slot = (rank: number) =>
  screen.getByRole("button", { name: new RegExp(`rank ${rank}`, "i") });

/**
 * The blind ranking interaction, shared by Guess-who's `rank` arm and the whole
 * of Shared-grid.
 *
 * It used to list every option at once and take them in click order, which is
 * not what rank_blind is: the format's whole premise is that you commit to a
 * position for ONE item without knowing what is still coming. This mirrors the
 * solo flow (RankPlayScreen) — the current item with its media on one side, the
 * numbered slots to drop it into on the other.
 */
describe("BlindRankBoard", () => {
  it("plays the current item's video, like every other board", () => {
    renderBoard();

    expect(
      screen.getByRole("button", { name: /play video preview/i }),
    ).toBeInTheDocument();
  });

  // The point of the format. Showing the whole list up front turns a blind
  // ranking into an ordinary sort.
  it("reveals one item at a time, not the whole draw", () => {
    renderBoard();

    expect(screen.getByText("Silhouette")).toBeInTheDocument();
    expect(screen.queryByText("Sushi")).toBeNull();
  });

  it("moves to the next item once the current one is placed", async () => {
    renderBoard();

    await userEvent.click(slot(2));

    // Placed at rank 2, and the next hidden item is now the one being placed.
    expect(screen.getByText("Sushi")).toBeInTheDocument();
  });

  // Click ORDER is not rank order — that was the old behaviour and it made the
  // slots decorative. The submitted ranking is the board, top to bottom.
  it("submits the ranking in SLOT order, not click order", async () => {
    const onSubmit = renderBoard();

    await userEvent.click(slot(2)); // Silhouette -> rank 2
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(slot(1)); // Sushi -> rank 1

    expect(onSubmit).toHaveBeenCalledWith(["t1", "y1"]);
  });

  it("shows what landed in each slot once placed", async () => {
    renderBoard();

    await userEvent.click(slot(1));

    expect(
      screen.getByRole("button", { name: /rank 1: silhouette/i }),
    ).toBeInTheDocument();
  });

  it("refuses a slot that is already taken", async () => {
    const onSubmit = renderBoard();

    await userEvent.click(slot(1));
    await userEvent.click(slot(1));

    // The second click landed nowhere, so the round is still open.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("takes no placement once the round is locked", async () => {
    const onSubmit = renderBoard({ disabled: true });

    await userEvent.click(slot(1));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
