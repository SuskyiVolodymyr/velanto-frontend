import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
    expect(label.className).toContain("mb-3");
  });

  it("renders exactly one chip per pick, with the correct title text and chip styling", () => {
    const picks: Pick[] = [
      makePick({ groupId: "a", itemTitle: "2016" }),
      makePick({ groupId: "b", itemTitle: "2017" }),
      makePick({ groupId: "c", itemTitle: "Team Alpha" }),
    ];

    render(<PicksSummary label="Saved so far" picks={picks} />);

    const chip = screen.getByText("2016");
    expect(chip).toBeInTheDocument();
    expect(screen.getByText("2017")).toBeInTheDocument();
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(chip.className).toContain("inline-flex");
    expect(chip.className).toContain("rounded-control");
    expect(chip.className).toContain("border-border");
    expect(chip.className).toContain("play-card-appear");
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
});
