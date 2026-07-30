import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PicksSummary } from "@/src/features/play/PicksSummary";
import type { Pick } from "@/src/features/play/use-play-session";

function makePick(overrides: Partial<Pick>): Pick {
  return {
    roundIndex: 0,
    groupId: "group-1",
    itemTitle: "Untitled",
    ...overrides,
  };
}

describe("PicksSummary", () => {
  it("renders the caller-supplied label text with the eyebrow styling", () => {
    render(<PicksSummary label="Saved so far" picks={[]} />);

    const label = screen.getByText("Saved so far");
    expect(label).toBeInTheDocument();
    expect(label.className).toContain("text-[12px]");
    expect(label.className).toContain("uppercase");
    expect(label.className).toContain("tracking-[0.12em]");
  });

  it("renders exactly one chip per pick, with the correct title text and chip styling", () => {
    const picks: Pick[] = [
      makePick({ groupId: "a", itemTitle: "2016" }),
      makePick({ groupId: "b", itemTitle: "2017" }),
      makePick({ groupId: "c", itemTitle: "Team Alpha" }),
    ];

    render(<PicksSummary label="Saved so far" picks={picks} />);

    const chip = screen.getByText("2016").closest("span");
    expect(chip).toBeInTheDocument();
    expect(screen.getByText("2017")).toBeInTheDocument();
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(chip?.className).toContain("inline-flex");
    expect(chip?.className).toContain("rounded-control");
    expect(chip?.className).toContain("border-border");
    expect(chip?.className).toContain("play-card-appear");
  });

  it("keeps rendering one chip per item after the picks array reorders", () => {
    const picks: Pick[] = [
      makePick({ groupId: "a", itemTitle: "First" }),
      makePick({ groupId: "b", itemTitle: "Second" }),
    ];
    const { rerender } = render(
      <PicksSummary label="Saved so far" picks={picks} />,
    );

    expect(screen.getAllByText(/First|Second/)).toHaveLength(2);

    const reordered: Pick[] = [picks[1], picks[0]];
    rerender(<PicksSummary label="Saved so far" picks={reordered} />);

    expect(screen.getAllByText(/First|Second/)).toHaveLength(2);
  });

  it("shows each chip's 1-based position as a numbered badge", () => {
    const picks: Pick[] = [
      makePick({ groupId: "a", itemTitle: "First" }),
      makePick({ groupId: "b", itemTitle: "Second" }),
    ];

    render(<PicksSummary label="Saved so far" picks={picks} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows a done/to-go count note beside the heading when totalRounds is passed", () => {
    const picks: Pick[] = [
      makePick({ groupId: "a", itemTitle: "First" }),
      makePick({ groupId: "b", itemTitle: "Second" }),
    ];

    render(
      <PicksSummary label="Saved so far" picks={picks} totalRounds={5} />,
    );

    expect(screen.getByText("2 done, 3 to go")).toBeInTheDocument();
  });

  it("omits the count note when totalRounds isn't passed", () => {
    render(<PicksSummary label="Saved so far" picks={[]} />);

    expect(screen.queryByText(/done,/)).not.toBeInTheDocument();
  });

  describe("groupByRound (nxn: a side can hold several items per round)", () => {
    it("renders one container per round, holding that round's items together", () => {
      const picks: Pick[] = [
        makePick({ roundIndex: 0, groupId: "a", itemId: "1", itemTitle: "Naruto" }),
        makePick({ roundIndex: 0, groupId: "a", itemId: "2", itemTitle: "Sasuke" }),
        makePick({ roundIndex: 0, groupId: "a", itemId: "3", itemTitle: "Sakura" }),
        makePick({ roundIndex: 1, groupId: "b", itemId: "4", itemTitle: "Luffy" }),
      ];

      render(
        <PicksSummary label="Saved so far" picks={picks} groupByRound />,
      );

      // Round 1's three items share one container; round 2's one item is in
      // its own separate container — not six items flattened into one row.
      const naruto = screen.getByText("Naruto");
      const luffy = screen.getByText("Luffy");
      const round1Container = naruto.closest('[data-testid="picks-round-group"]');
      const round2Container = luffy.closest('[data-testid="picks-round-group"]');
      expect(round1Container).toBeInTheDocument();
      expect(round2Container).toBeInTheDocument();
      expect(round1Container).not.toBe(round2Container);
      expect(round1Container).toContainElement(screen.getByText("Sasuke"));
      expect(round1Container).toContainElement(screen.getByText("Sakura"));
      expect(round1Container).not.toContainElement(luffy);

      expect(
        screen.getAllByTestId("picks-round-group"),
      ).toHaveLength(2);
    });

    it("counts DONE as rounds, not individual items, once grouped", () => {
      const picks: Pick[] = [
        makePick({ roundIndex: 0, groupId: "a", itemId: "1", itemTitle: "Naruto" }),
        makePick({ roundIndex: 0, groupId: "a", itemId: "2", itemTitle: "Sasuke" }),
        makePick({ roundIndex: 0, groupId: "a", itemId: "3", itemTitle: "Sakura" }),
      ];

      render(
        <PicksSummary
          label="Saved so far"
          picks={picks}
          totalRounds={5}
          groupByRound
        />,
      );

      // One round finished (all three items belong to round 0), 4 to go — NOT
      // "3 done" (which would be counting items instead of rounds).
      expect(screen.getByText("1 done, 4 to go")).toBeInTheDocument();
    });

    it("keeps the plain flat chip row when groupByRound is left off", () => {
      const picks: Pick[] = [
        makePick({ roundIndex: 0, groupId: "a", itemTitle: "2016" }),
        makePick({ roundIndex: 1, groupId: "b", itemTitle: "2017" }),
      ];

      render(<PicksSummary label="Saved so far" picks={picks} />);

      expect(
        screen.queryByTestId("picks-round-group"),
      ).not.toBeInTheDocument();
    });
  });
});
