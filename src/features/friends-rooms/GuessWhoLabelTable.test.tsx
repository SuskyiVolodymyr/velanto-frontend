import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GuessWhoLabelTable } from "./GuessWhoLabelTable";
import { baseRoomState } from "./test-fixtures";

const LONG = "Haikyu!! - Burnout Syndromes / Fly High!!";

function stateWithPick() {
  return baseRoomState({
    mode: "guess_who",
    labels: ["P1", "P2"],
    results: [
      {
        kind: "reveal",
        index: 0,
        name: "Round 1",
        items: [
          { id: "i1", title: LONG, type: "text", value: LONG },
          { id: "i2", title: "Suzume", type: "text", value: "Suzume" },
        ],
        picks: { P1: ["i1"], P2: ["i2"] },
      },
    ],
  });
}

describe("GuessWhoLabelTable", () => {
  // The cell was `flex … truncate`: truncate hides overflow on the CONTAINER,
  // but the text inside a flex container is a flex item that will not shrink,
  // so a long title spilled out of both sides of its column and over its
  // neighbours instead of ellipsising.
  it("truncates a long title inside its own cell", () => {
    render(<GuessWhoLabelTable state={stateWithPick()} />);

    const cell = screen.getByText(LONG);
    expect(cell).toHaveClass("truncate");
    expect(cell.className).not.toMatch(/\bflex\b/);
  });

  // Truncation loses the end of the name, and a column IS the thing you are
  // reading — so the full title stays reachable on hover.
  it("keeps the full title readable on hover", () => {
    render(<GuessWhoLabelTable state={stateWithPick()} />);

    expect(screen.getByText(LONG)).toHaveAttribute("title", LONG);
  });

  // An nxn pick names a POOL, so it resolved to nothing in `items` and every
  // cell printed a raw group id. The pick is named by its side, and the side's
  // drawn items are listed under it — a pool name alone doesn't say what was
  // actually on the board that round.
  describe("an nxn round, where a pick is a side", () => {
    function nxnState() {
      const items = [
        { id: "i1", title: "Horimiya", type: "text" as const, value: "a" },
        {
          id: "i2",
          title: "Rent-a-Girlfriend",
          type: "text" as const,
          value: "b",
        },
        {
          id: "i3",
          title: "Bunny Girl Senpai",
          type: "text" as const,
          value: "c",
        },
        { id: "i4", title: "Berserk", type: "text" as const, value: "d" },
      ];
      return baseRoomState({
        mode: "guess_who",
        packFormat: "nxn",
        labels: ["P1", "P2"],
        results: [
          {
            kind: "reveal",
            index: 0,
            name: "Round 1",
            items,
            picks: { P1: ["grp_romance"], P2: ["grp_dark"] },
            sides: [
              {
                id: "grp_romance",
                name: "Romance",
                itemIds: ["i1", "i2", "i3"],
              },
              { id: "grp_dark", name: "Dark", itemIds: ["i4"] },
            ],
          },
        ],
      });
    }

    it("names the picked side instead of printing its group id", () => {
      render(<GuessWhoLabelTable state={nxnState()} />);

      expect(screen.getByText("Romance")).toBeInTheDocument();
      expect(screen.getByText("Dark")).toBeInTheDocument();
      expect(screen.queryByText("grp_romance")).toBeNull();
      expect(screen.queryByText("grp_dark")).toBeNull();
    });

    it("lists the side's own drawn items under its name (nxn)", () => {
      render(<GuessWhoLabelTable state={nxnState()} />);

      for (const title of [
        "Horimiya",
        "Rent-a-Girlfriend",
        "Bunny Girl Senpai",
      ]) {
        expect(screen.getByText(title)).toBeInTheDocument();
      }
      expect(screen.getByText("Berserk")).toBeInTheDocument();
    });
  });

  // A rank_blind pick is a whole ORDERING. The cell showed only its first
  // entry, so the table — which IS the evidence the guessing screen is read
  // from — threw away almost everything each round revealed.
  describe("a rank_blind round, where a pick is an ordering", () => {
    const items = [
      { id: "i1", title: "Pizza", type: "text" as const, value: "a" },
      { id: "i2", title: "Sushi", type: "text" as const, value: "b" },
      { id: "i3", title: "Tacos", type: "text" as const, value: "c" },
    ];

    function rankedState() {
      return baseRoomState({
        mode: "guess_who",
        packFormat: "rank_blind",
        labels: ["P1", "P2"],
        results: [
          {
            kind: "reveal",
            index: 0,
            name: "Round 1",
            items,
            picks: { P1: ["i1", "i2", "i3"], P2: ["i3", "i1", "i2"] },
          },
        ],
      });
    }

    it("shows every label's full ordering, in that label's own order", () => {
      render(<GuessWhoLabelTable state={rankedState()} />);

      const cells = screen.getAllByRole("list");
      expect(cells).toHaveLength(2); // one ordering per label
      expect(
        within(cells[0])
          .getAllByRole("listitem")
          .map((li) => li.textContent),
      ).toEqual(["1Pizza", "2Sushi", "3Tacos"]);
      expect(
        within(cells[1])
          .getAllByRole("listitem")
          .map((li) => li.textContent),
      ).toEqual(["1Tacos", "2Pizza", "3Sushi"]);
    });

    it("keeps every title readable on hover, since a cell is narrow", () => {
      render(<GuessWhoLabelTable state={rankedState()} />);

      expect(screen.getAllByTitle("Pizza")).toHaveLength(2);
    });
  });
});
