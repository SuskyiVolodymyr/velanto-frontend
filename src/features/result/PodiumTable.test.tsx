import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PodiumTable } from "./PodiumTable";
import type {
  PodiumTally,
  RecordedPick,
} from "@/src/shared/types/play-results";

function podium(n: number): PodiumTally {
  return {
    itemId: `t${n}`,
    itemTitle: `Item ${n}`,
    first: 8 - n,
    second: 1,
    third: 0,
    total: 9 - n,
  };
}

describe("PodiumTable", () => {
  it("shows 5 rows initially, not 10 (T11)", () => {
    const items = Array.from({ length: 8 }, (_, i) => podium(i + 1));
    render(<PodiumTable items={items} />);

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
  });

  it("loads 5 more rows at a time", async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 8 }, (_, i) => podium(i + 1));
    render(<PodiumTable items={items} />);

    await user.click(screen.getByRole("button", { name: "Show 3 more" }));
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(8);
    expect(screen.queryByRole("button", { name: /show/i })).toBeNull();
  });

  // Shared BoardRow: "mine" reads as a brighter NAME COLOUR plus the YOURS
  // pill, not a heavier weight — every row is the same weight in the mock.
  it("colors an item's name brighter when it appears in ownPicks", () => {
    const items = [podium(1), podium(2)];
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "t2" },
    ];
    render(<PodiumTable items={items} ownPicks={ownPicks} />);

    expect(screen.getByText("Item 1")).toHaveClass("text-foreground-secondary");
    expect(screen.getByText("Item 2")).toHaveClass("text-foreground");
  });

  it("renders as a rounded aside card", () => {
    const { container } = render(<PodiumTable items={[podium(1)]} />);

    expect(container.firstElementChild).toHaveClass("rounded-[20px]");
  });

  it("ranks items by first/second/third combined", () => {
    const items: PodiumTally[] = [
      {
        itemId: "i1",
        itemTitle: "Kaikai Kitan",
        first: 2,
        second: 1,
        third: 0,
        total: 3,
      },
      {
        itemId: "i2",
        itemTitle: "Redo",
        first: 0,
        second: 1,
        third: 1,
        total: 2,
      },
    ];
    render(<PodiumTable items={items} />);

    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Kaikai Kitan");
    expect(rows[0]).toHaveAttribute("data-rank", "1");
    expect(rows[1]).toHaveTextContent("Redo");
    expect(rows[1]).toHaveAttribute("data-rank", "2");
  });

  it("renders a visible bold title and footnote when passed", () => {
    render(
      <PodiumTable
        items={[podium(1)]}
        title="Podium finishes"
        subtitle="Ranked by first, second and third combined."
      />,
    );

    expect(screen.getByText("Podium finishes")).toBeInTheDocument();
    expect(
      screen.getByText("Ranked by first, second and third combined."),
    ).toBeInTheDocument();
  });

  it("marks the viewer's own picks with a YOURS pill", () => {
    const items = [podium(1), podium(2)];
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "t2" },
    ];
    render(<PodiumTable items={items} ownPicks={ownPicks} />);

    expect(screen.getByText("Yours")).toBeInTheDocument();
  });
});
