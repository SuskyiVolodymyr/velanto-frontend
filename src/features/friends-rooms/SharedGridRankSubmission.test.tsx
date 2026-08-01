import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { SharedGridRankSubmission } from "./SharedGridRankSubmission";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

/** A rank slot by its position — the board is what you click, not the item. */
const slot = (rank: number) =>
  screen.getByRole("button", { name: new RegExp(`rank ${rank}`, "i") });

describe("SharedGridRankSubmission", () => {
  it("ranking every item in order submits the full ranking", async () => {
    const onSubmitRanking = vi.fn();
    render(
      <SharedGridRankSubmission
        state={baseRoomState({
          mode: "shared_grid",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A"), ITEM("i2", "B")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            lockedIn: [],
          },
        })}
        currentUserId="u1"
        onSubmitRanking={onSubmitRanking}
      />,
    );
    // Items are revealed one at a time and dropped into a numbered slot, so
    // the ranking is the BOARD's order: A into #1, then B into #2.
    await userEvent.click(slot(1));
    await userEvent.click(slot(2));
    expect(onSubmitRanking).toHaveBeenCalledWith(["i1", "i2"]);
  });

  it("shows who's locked in via the shared LockedInRoster", () => {
    render(
      <SharedGridRankSubmission
        state={baseRoomState({
          mode: "shared_grid",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "A")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1"],
            lockedIn: ["u1"],
          },
        })}
        currentUserId="u2"
        onSubmitRanking={vi.fn()}
      />,
    );
    expect(screen.getByText(/alice has locked in/i)).toBeInTheDocument();
  });
});

describe("SharedGridRankSubmission — rejected ranking", () => {
  function state() {
    return baseRoomState({
      mode: "shared_grid",
      round: {
        index: 0,
        name: "",
        items: [ITEM("i1", "A"), ITEM("i2", "B")],
        claims: {},
        survivorItemId: null,
        optionIds: ["i1", "i2"],
        lockedIn: [],
      },
    });
  }

  // BlindRankBoard auto-submits on the final click and then disables every
  // button, so a REJECTED ranking used to strand the player with a full,
  // frozen board and no way to retry for the rest of the round.
  it("a bumped rejection token clears the board so the player can rank again", async () => {
    const onSubmitRanking = vi.fn();
    const { rerender } = render(
      <SharedGridRankSubmission
        state={state()}
        currentUserId="u1"
        onSubmitRanking={onSubmitRanking}
        rejectionToken={0}
      />,
    );
    await userEvent.click(slot(1));
    await userEvent.click(slot(2));
    // Every slot is taken, so the board is frozen.
    expect(slot(1)).toBeDisabled();

    rerender(
      <SharedGridRankSubmission
        state={state()}
        currentUserId="u1"
        onSubmitRanking={onSubmitRanking}
        rejectionToken={1}
      />,
    );

    expect(slot(1)).not.toBeDisabled();
    // Ranking again the other way round: A into #2, then B into #1.
    await userEvent.click(slot(2));
    await userEvent.click(slot(1));
    expect(onSubmitRanking).toHaveBeenLastCalledWith(["i2", "i1"]);
  });
});
