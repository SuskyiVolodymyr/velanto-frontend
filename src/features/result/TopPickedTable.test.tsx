import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { TopPickedTable } from "./TopPickedTable";
import type { ItemTally, RecordedPick } from "@/src/shared/types/play-results";

function tally(n: number): ItemTally {
  return {
    itemId: `t${n}`,
    itemTitle: `Item ${n}`,
    picked: 10 - n,
    appeared: 10,
    percentage: 100 - n * 10,
  };
}

describe("TopPickedTable", () => {
  it("shows 5 rows initially, not 10 (T11)", () => {
    const items = Array.from({ length: 8 }, (_, i) => tally(i + 1));
    render(<TopPickedTable items={items} />);

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
  });

  it("loads 5 more rows at a time", async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 8 }, (_, i) => tally(i + 1));
    render(<TopPickedTable items={items} />);

    // Mock's own label counts what the next press would add ("Show 3 more"),
    // rather than a bare "Load more".
    await user.click(screen.getByRole("button", { name: "Show 3 more" }));
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(8);
    expect(screen.queryByRole("button", { name: /show/i })).toBeNull();
  });

  // Mock: `nameFg` differs by color (mine = full white, others = muted), not
  // by weight — every row is font-weight 650. Rebuilt from the old table's
  // font-semibold/font-bold distinction to match.
  it("colors an item's name brighter when it appears in ownPicks", () => {
    const items = [tally(1), tally(2)];
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "t2" },
    ];
    render(<TopPickedTable items={items} ownPicks={ownPicks} />);

    expect(screen.getByText("Item 1")).toHaveClass("text-foreground-secondary");
    expect(screen.getByText("Item 2")).toHaveClass("text-foreground");
  });

  it("does not brighten anything when ownPicks is omitted", () => {
    render(<TopPickedTable items={[tally(1)]} />);

    expect(screen.getByText("Item 1")).toHaveClass("text-foreground-secondary");
  });

  it("renders as a rounded aside card", () => {
    const { container } = render(<TopPickedTable items={[tally(1)]} />);

    expect(container.firstElementChild).toHaveClass("rounded-[20px]");
  });

  it("uses the caller-supplied label for assistive tech when passed", () => {
    render(<TopPickedTable items={[tally(1)]} label="Most saved" />);

    expect(screen.getByRole("list", { name: "Most saved" })).toBeInTheDocument();
  });

  it("shares a place between equal scores and skips the one they consumed", () => {
    // Two items on 90% off 27 picks tie for first, so the next is THIRD —
    // second is not awarded. A third item matches the percentage but not the
    // pick count, which is a different result and ranks on its own.
    const tie: ItemTally[] = [
      { itemId: "a", itemTitle: "Alpha", picked: 27, appeared: 30, percentage: 90 },
      { itemId: "b", itemTitle: "Beta", picked: 27, appeared: 30, percentage: 90 },
      { itemId: "c", itemTitle: "Gamma", picked: 9, appeared: 10, percentage: 90 },
      { itemId: "d", itemTitle: "Delta", picked: 1, appeared: 10, percentage: 10 },
    ];
    render(<TopPickedTable items={tie} />);

    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows.map((row) => row.getAttribute("data-rank"))).toEqual([
      "1",
      "1",
      "3",
      "4",
    ]);
  });

  // Mock: only the FIRST-place row gets the amber rank number + cyan bar/
  // percent — there is no medal-bordered treatment for 2nd/3rd at all (that
  // was T11's own invention, never actually in the mock — removed).
  it("highlights only first place, not a medal podium of three", () => {
    const tie: ItemTally[] = [
      { itemId: "a", itemTitle: "Alpha", picked: 9, appeared: 10, percentage: 90 },
      { itemId: "b", itemTitle: "Beta", picked: 9, appeared: 10, percentage: 90 },
      { itemId: "c", itemTitle: "Gamma", picked: 5, appeared: 10, percentage: 50 },
    ];
    render(<TopPickedTable items={tie} />);

    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    // `pctFg` is the LIGHTER cyan (--acc-hover / #8CF3FF) in the mock, not
    // the saturated --acc the bar fill uses.
    expect(within(rows[0]).getByText("1")).toHaveClass("text-score");
    expect(within(rows[0]).getByText("90%")).toHaveClass("text-acc-hover");
    expect(within(rows[1]).getByText("1")).toHaveClass("text-score");
    expect(within(rows[1]).getByText("90%")).toHaveClass("text-acc-hover");
    expect(within(rows[2]).getByText("3")).not.toHaveClass("text-score");
    expect(within(rows[2]).getByText("50%")).not.toHaveClass("text-acc-hover");
  });

  it("renders a visible bold title, right-aligned note, and footnote when passed", () => {
    render(
      <TopPickedTable
        items={[tally(1)]}
        title="Most saved"
        note="across 2,142 plays"
        subtitle="Share of the rounds each item actually appeared in."
      />,
    );

    expect(screen.getByText("Most saved")).toBeInTheDocument();
    expect(screen.getByText("across 2,142 plays")).toBeInTheDocument();
    expect(
      screen.getByText("Share of the rounds each item actually appeared in."),
    ).toBeInTheDocument();
  });

  it("omits the note row entirely when no title is passed", () => {
    render(<TopPickedTable items={[tally(1)]} note="across 2,142 plays" />);

    expect(screen.queryByText("across 2,142 plays")).not.toBeInTheDocument();
  });

  it("marks the viewer's own picks with a YOURS pill", () => {
    const items = [tally(1), tally(2)];
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "t2" },
    ];
    render(<TopPickedTable items={items} ownPicks={ownPicks} />);

    expect(screen.getByText("Yours")).toBeInTheDocument();
  });
});
