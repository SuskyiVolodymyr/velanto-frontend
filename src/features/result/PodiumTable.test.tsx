import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PodiumTable } from "./PodiumTable";
import type { PodiumTally, RecordedPick } from "@/src/shared/types/play-results";

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

    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 5); // header + 5
  });

  it("loads 5 more rows at a time", async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 8 }, (_, i) => podium(i + 1));
    render(<PodiumTable items={items} />);

    await user.click(screen.getByRole("button", { name: /load more/i }));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 8);
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("bolds an item's name when it appears in ownPicks", () => {
    const items = [podium(1), podium(2)];
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "t2" },
    ];
    render(<PodiumTable items={items} ownPicks={ownPicks} />);

    expect(screen.getByText("Item 1")).toHaveClass("font-semibold");
    expect(screen.getByText("Item 2")).toHaveClass("font-bold");
  });

  it("renders as a rounded aside card", () => {
    const { container } = render(<PodiumTable items={[podium(1)]} />);

    expect(container.firstElementChild).toHaveClass("rounded-[20px]");
  });
});
