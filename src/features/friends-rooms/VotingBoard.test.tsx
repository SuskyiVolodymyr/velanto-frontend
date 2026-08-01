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
    // Pizza's count reads twice — on its own tile and in the aside's live
    // tally — which is the point of having both.
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole("region", { name: "Live tally" }),
    ).toBeInTheDocument();
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
    // The priority holder is a crown on their avatar in the Room panel now,
    // not a captioned badge — but it must still SAY what it means, or it is
    // just an unexplained gold dot.
    expect(
      screen.getByRole("img", { name: "Alice holds priority" }),
    ).toBeInTheDocument();
  });

  it("warns once a tie could actually decide the round", () => {
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
            votes: { u1: "i1", u2: "i2" },
            priorityUserId: "u1",
          },
        })}
        currentUserId="u1"
        onVote={vi.fn()}
      />,
    );
    expect(
      screen.getByText("It's tied — Alice's priority decides"),
    ).toBeInTheDocument();
  });

  // One vote each on two options with everyone still to go is not news; the
  // warning is for a tie that is about to matter.
  it("stays quiet on a single vote", () => {
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
        onVote={vi.fn()}
      />,
    );
    expect(screen.queryByText(/It's tied/)).not.toBeInTheDocument();
  });

  // A 1v1 round IS a matchup, and it was drawn as two cards in an auto-fill
  // grid — no relationship shown between them. Solo play and Guess-who's own
  // 1v1 board both draw this format as a versus pair.
  describe("a 1v1 round", () => {
    function pairState() {
      return baseRoomState({
        mode: "voting",
        packFormat: "1v1",
        round: {
          index: 0,
          name: "",
          items: [ITEM("i1", "Lover"), ITEM("i2", "Contradicting")],
          claims: {},
          survivorItemId: null,
          optionIds: ["i1", "i2"],
          votes: {},
        },
      });
    }

    it("puts a VS between the two contenders", () => {
      render(
        <VotingBoard state={pairState()} currentUserId="u1" onVote={vi.fn()} />,
      );

      expect(screen.getByText("VS", { exact: true })).toBeInTheDocument();
    });

    it("still votes for the option that was clicked", async () => {
      const onVote = vi.fn();
      render(
        <VotingBoard state={pairState()} currentUserId="u1" onVote={onVote} />,
      );

      await userEvent.click(screen.getByRole("button", { name: /lover/i }));
      expect(onVote).toHaveBeenCalledWith("i1");
    });

    it("draws no VS for a format whose round is not a matchup", () => {
      render(
        <VotingBoard
          state={baseRoomState({
            mode: "voting",
            packFormat: "save_one",
            round: {
              index: 0,
              name: "",
              // Two drawn items is not a versus — a VS would claim a
              // relationship the round does not have.
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              claims: {},
              survivorItemId: null,
              optionIds: ["i1", "i2"],
              votes: {},
            },
          })}
          currentUserId="u1"
          onVote={vi.fn()}
        />,
      );

      expect(screen.queryByText("VS", { exact: true })).toBeNull();
    });
  });
});
