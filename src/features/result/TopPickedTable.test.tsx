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

    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 5); // header + 5
  });

  it("loads 5 more rows at a time", async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 8 }, (_, i) => tally(i + 1));
    render(<TopPickedTable items={items} />);

    await user.click(screen.getByRole("button", { name: /load more/i }));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 8);
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("bolds an item's name when it appears in ownPicks", () => {
    const items = [tally(1), tally(2)];
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "t2" },
    ];
    render(<TopPickedTable items={items} ownPicks={ownPicks} />);

    expect(screen.getByText("Item 1")).toHaveClass("font-semibold");
    expect(screen.getByText("Item 2")).toHaveClass("font-bold");
  });

  it("does not bold anything when ownPicks is omitted", () => {
    render(<TopPickedTable items={[tally(1)]} />);

    expect(screen.getByText("Item 1")).not.toHaveClass("font-bold");
  });

  it("renders as a rounded aside card", () => {
    const { container } = render(<TopPickedTable items={[tally(1)]} />);

    expect(container.firstElementChild).toHaveClass("rounded-[20px]");
  });

  it("uses the caller-supplied label for assistive tech when passed", () => {
    render(<TopPickedTable items={[tally(1)]} label="Most saved" />);

    expect(screen.getByRole("table", { name: "Most saved" })).toBeInTheDocument();
  });
});
