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
    await userEvent.click(screen.getByRole("button", { name: /a/i }));
    await userEvent.click(screen.getByRole("button", { name: /b/i }));
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
    expect(screen.getByLabelText(/alice.*locked in/i)).toBeInTheDocument();
  });
});
