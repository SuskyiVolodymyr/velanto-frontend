import { screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessWhoRevealBoard } from "./GuessWhoRevealBoard";
import { baseRoomState } from "./test-fixtures";

const ITEM = (id: string, title: string) => ({
  id,
  title,
  type: "text" as const,
  value: title,
});

// The reveal is not a screen of its own: it is the round you were just looking
// at, with the labels landed on the cards. A separate table pulled everyone off
// the board mid-game to read a spreadsheet — the chronology belongs on the
// results screen, which already has it.
describe("GuessWhoRevealBoard", () => {
  it("marks the closed round's own cards with the label that picked each", () => {
    render(
      <GuessWhoRevealBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 0,
            name: "Round 1",
            items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "reveal",
              index: 0,
              name: "Round 1",
              items: [ITEM("i1", "Pizza"), ITEM("i2", "Sushi")],
              picks: { P1: ["i1"], P2: ["i1"], P3: ["i2"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={() => {}}
      />,
    );

    const pizza = screen.getByRole("group", { name: "Pizza" });
    expect(within(pizza).getByText("P1")).toBeInTheDocument();
    expect(within(pizza).getByText("P2")).toBeInTheDocument();
    expect(within(pizza).queryByText("P3")).toBeNull();

    const sushi = screen.getByRole("group", { name: "Sushi" });
    expect(within(sushi).getByText("P3")).toBeInTheDocument();
  });

  it("does not put a chronology table in the middle of the game", () => {
    render(
      <GuessWhoRevealBoard
        state={baseRoomState({
          mode: "guess_who",
          round: {
            index: 1,
            name: "Round 2",
            items: [ITEM("i1", "Pizza")],
            claims: {},
            survivorItemId: null,
          },
          results: [
            {
              kind: "reveal",
              index: 0,
              name: "Round 1",
              items: [ITEM("i3", "Tacos")],
              picks: { P1: ["i3"] },
            },
            {
              kind: "reveal",
              index: 1,
              name: "Round 2",
              items: [ITEM("i1", "Pizza")],
              picks: { P1: ["i1"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={() => {}}
      />,
    );

    expect(screen.queryByRole("table")).toBeNull();
    // Only the round that just closed — not the whole history.
    expect(screen.queryByText("Tacos")).toBeNull();
    expect(screen.getByRole("group", { name: "Pizza" })).toBeInTheDocument();
  });

  // An nxn pick names a SIDE, so the label chips — keyed by item id — never
  // matched anything: the reveal showed every video from both sides in one
  // flat grid, with not a single pick on it. One full-width row per side, the
  // way the solo versus result reads, each carrying the labels that took it.
  it("shows an nxn round as one row per side, with the labels that picked each", () => {
    render(
      <GuessWhoRevealBoard
        state={baseRoomState({
          mode: "guess_who",
          packFormat: "nxn",
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
              kind: "reveal",
              index: 0,
              name: "FLOW",
              items: [ITEM("i1", "Radwimps"), ITEM("i2", "Yorushika")],
              picks: { P1: ["ca"], P2: ["ca"], P3: ["cb"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={() => {}}
      />,
    );

    const sideA = screen.getByRole("group", { name: "Side A" });
    expect(within(sideA).getByText("Radwimps")).toBeInTheDocument();
    expect(within(sideA).getByText("P1")).toBeInTheDocument();
    expect(within(sideA).getByText("P2")).toBeInTheDocument();
    expect(within(sideA).queryByText("P3")).toBeNull();

    const sideB = screen.getByRole("group", { name: "Side B" });
    expect(within(sideB).getByText("P3")).toBeInTheDocument();
  });

  // The owner asked for this screen to read the way a solo nxn round does:
  // two stacked rows with a VS between them, each item's title directly under
  // its own media. The round board's tile is a different thing — it is a
  // pick target — so this screen renders its own presentation rather than
  // reshaping the shared one.
  it("stacks the two nxn sides with a VS divider between them", () => {
    render(
      <GuessWhoRevealBoard
        state={baseRoomState({
          mode: "guess_who",
          packFormat: "nxn",
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
              kind: "reveal",
              index: 0,
              name: "FLOW",
              items: [ITEM("i1", "Radwimps"), ITEM("i2", "Yorushika")],
              picks: { P1: ["ca"], P2: ["cb"] },
            },
          ],
        })}
        currentUserId="u1"
        onNext={() => {}}
      />,
    );

    expect(screen.getByText("VS", { exact: true })).toBeInTheDocument();
    // Both sides present, in the round's own order.
    const groups = screen.getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Side A",
      "Side B",
    ]);
  });

  // A rank_blind pick is a whole ORDERING, not a choice. Marking only its first
  // entry on a card threw away everything the round actually revealed — and the
  // orderings are the entire evidence base for guessing who is who.
  describe("a rank_blind round", () => {
    function rankedState() {
      const items = [
        ITEM("i1", "Pizza"),
        ITEM("i2", "Sushi"),
        ITEM("i3", "Tacos"),
      ];
      return baseRoomState({
        mode: "guess_who",
        packFormat: "rank_blind",
        labels: ["P1", "P2"],
        round: {
          index: 0,
          name: "Food",
          items,
          claims: {},
          survivorItemId: null,
          optionIds: ["i1", "i2", "i3"],
          actionKind: "rank" as const,
        },
        results: [
          {
            kind: "reveal",
            index: 0,
            name: "Food",
            items,
            picks: {
              P1: ["i1", "i2", "i3"],
              P2: ["i3", "i1", "i2"],
            },
          },
        ],
      });
    }

    it("gives every label its own ranking table", () => {
      render(
        <GuessWhoRevealBoard
          state={rankedState()}
          currentUserId="u1"
          onNext={() => {}}
        />,
      );

      expect(
        screen.getAllByRole("group").map((g) => g.getAttribute("aria-label")),
      ).toEqual(["P1", "P2"]);
    });

    it("lists each label's full ordering, in its own order", () => {
      render(
        <GuessWhoRevealBoard
          state={rankedState()}
          currentUserId="u1"
          onNext={() => {}}
        />,
      );

      const rowsOf = (label: string) =>
        within(screen.getByRole("group", { name: label }))
          .getAllByRole("listitem")
          .map((li) => li.textContent);

      expect(rowsOf("P1")).toEqual(["1Pizza", "2Sushi", "3Tacos"]);
      // The same three items, ranked differently — which is the whole tell.
      expect(rowsOf("P2")).toEqual(["1Tacos", "2Pizza", "3Sushi"]);
    });
  });
});
