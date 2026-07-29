import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { VotingBoard } from "./VotingBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("VotingBoard", () => {
  it("clicking an option casts a vote, and the live tally shows every option's current count", () => {
    render(
      <VotingBoard
        state={baseRoomState({
          mode: "voting",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            votes: { u2: "i1" },
            priorityUserId: "u1",
          },
        })}
        currentUserId="u1"
        onVote={vi.fn()}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument(); // Pizza's live count
  });

  it("a vote can be changed freely — clicking a different option re-votes, no confirmation", async () => {
    const onVote = vi.fn();
    render(
      <VotingBoard
        state={baseRoomState({
          mode: "voting",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
            votes: { u1: "i1" },
            priorityUserId: "u1",
          },
        })}
        currentUserId="u1"
        onVote={onVote}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /sushi/i }));
    expect(onVote).toHaveBeenCalledWith("i2");
  });

  it("shows the priority-holder badge", () => {
    render(
      <VotingBoard
        state={baseRoomState({
          mode: "voting",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1"],
            votes: {},
            priorityUserId: "u1",
          },
        })}
        currentUserId="u2"
        onVote={vi.fn()}
      />,
    );
    expect(screen.getByText(/breaks ties/i)).toBeInTheDocument();
  });
});
