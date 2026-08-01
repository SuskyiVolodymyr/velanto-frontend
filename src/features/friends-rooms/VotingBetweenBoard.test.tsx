import { screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { VotingBetweenBoard } from "./VotingBetweenBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

describe("VotingBetweenBoard", () => {
  it("shows the winning option and, when tieBroken, explains the priority tiebreak", () => {
    render(
      <VotingBetweenBoard
        state={baseRoomState({
          mode: "voting",
          phase: "between",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "vote",
              index: 0,
              name: "",
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              optionIds: ["i1", "i2"],
              votes: { u1: "i1", u2: "i2" },
              tally: { i1: 1, i2: 1 },
              winnerOptionId: "i1",
              tieBroken: true,
              priorityUserId: "u1",
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );
    // Twice now: the heading names the winner, and the winner's own tile is
    // on the board below it.
    expect(screen.getAllByText("Pizza")).toHaveLength(2);
    expect(screen.getByText(/tie.*alice/i)).toBeInTheDocument();
  });

  // The screen used to print one title and nothing else — on an nxn round that
  // title was a raw pool uuid, and on any round it threw away the thing worth
  // seeing: what the room actually did. Every option is shown, with the people
  // who chose it.
  it("lists every option with the players who voted for it", () => {
    render(
      <VotingBetweenBoard
        state={baseRoomState({
          mode: "voting",
          phase: "between",
          round: {
            index: 0,
            name: "",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
            optionIds: ["i1", "i2"],
          },
          results: [
            {
              kind: "vote",
              index: 0,
              name: "",
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              optionIds: ["i1", "i2"],
              votes: { u1: "i1", u2: "i2" },
              tally: { i1: 1, i2: 1 },
              winnerOptionId: "i1",
              tieBroken: false,
              priorityUserId: "u1",
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );

    const pizza = screen.getByRole("group", { name: "Pizza" });
    expect(within(pizza).getByText("Alice")).toBeInTheDocument();
    const sushi = screen.getByRole("group", { name: "Sushi" });
    expect(within(sushi).getByText("Bob")).toBeInTheDocument();
  });

  // nxn votes name a SIDE, so the between screen has to resolve them the same
  // way the board does — from round.sides, not from items.
  it("shows an nxn round's sides by name, not their pool ids", () => {
    render(
      <VotingBetweenBoard
        state={baseRoomState({
          mode: "voting",
          packFormat: "nxn",
          phase: "between",
          round: {
            index: 0,
            name: "FLOW",
            items: [ITEM("i1", "Radwimps"), ITEM("i2", "Yorushika")],
            claims: {},
            survivorItemId: null,
            optionIds: ["ca", "cb"],
            sides: [
              { id: "ca", name: "Side A", itemIds: ["i1"] },
              { id: "cb", name: "Side B", itemIds: ["i2"] },
            ],
          },
          results: [
            {
              kind: "vote",
              index: 0,
              name: "FLOW",
              items: [ITEM("i1", "Radwimps"), ITEM("i2", "Yorushika")],
              optionIds: ["ca", "cb"],
              votes: { u1: "ca", u2: "ca" },
              tally: { ca: 2, cb: 0 },
              winnerOptionId: "ca",
              tieBroken: false,
              priorityUserId: "u1",
            },
          ],
        })}
        currentUserId="u1"
        onNext={vi.fn()}
      />,
    );

    const sideA = screen.getByRole("group", { name: "Side A" });
    expect(within(sideA).getByText("Radwimps")).toBeInTheDocument();
    expect(within(sideA).getByText("Alice")).toBeInTheDocument();
    expect(within(sideA).getByText("Bob")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Side B" })).toBeInTheDocument();
    expect(screen.queryByText("ca")).toBeNull();
  });
});
