import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ResultHero } from "./ResultHero";
import type { ResultTile } from "./result-summary";

describe("ResultHero", () => {
  it("renders the RUN COMPLETE eyebrow label", () => {
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        format="save_one"
        shared={false}
        totalRounds={2}
        totalPlays={4}
        tiles={[]}
      />,
    );

    expect(screen.getByText("Run complete")).toBeInTheDocument();
  });

  it("renders the format-aware own-result title as an h1 for save_one", () => {
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        format="save_one"
        shared={false}
        totalRounds={2}
        totalPlays={4}
        tiles={[]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Here's what you saved",
      }),
    ).toBeInTheDocument();
  });

  it("renders a different title for sacrifice_one", () => {
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        format="sacrifice_one"
        shared={false}
        totalRounds={2}
        totalPlays={4}
        tiles={[]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Here's what you sacrificed",
      }),
    ).toBeInTheDocument();
  });

  it("renders the shared-variant title as the h1 when shared", () => {
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        format="save_one"
        shared
        totalRounds={2}
        totalPlays={4}
        tiles={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1 }),
    ).not.toHaveTextContent("Here's what you saved");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Here's what they saved",
      }),
    ).toBeInTheDocument();
  });

  it("renders the pack title and fixed subtitle copy, not the h1", () => {
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        format="save_one"
        shared={false}
        totalRounds={2}
        totalPlays={4}
        tiles={[]}
      />,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).not.toHaveTextContent("Best Anime Openings");

    expect(screen.getByText(/Best Anime Openings/)).toBeInTheDocument();
    expect(
      screen.getByText(/recorded and folded into this pack's stats/),
    ).toBeInTheDocument();
  });

  it("renders the compact rounds/total-plays stat row", () => {
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        format="save_one"
        shared={false}
        totalRounds={8}
        totalPlays={42}
        tiles={[]}
      />,
    );

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Rounds")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Total plays")).toBeInTheDocument();
  });

  it("renders a percent tile with its value and label", () => {
    const tiles: ResultTile[] = [
      { kind: "percent", labelKey: "result.statAgreement", value: 62 },
    ];
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        format="save_one"
        shared={false}
        totalRounds={2}
        totalPlays={4}
        tiles={tiles}
      />,
    );

    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(
      screen.getByText("Average agreement with other players"),
    ).toBeInTheDocument();
  });

  it("renders a pick tile with the title and its interpolated percent label", () => {
    const tiles: ResultTile[] = [
      {
        kind: "pick",
        labelKey: "result.statTopPick",
        title: "Poster A",
        percent: 75,
      },
    ];
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        format="save_one"
        shared={false}
        totalRounds={2}
        totalPlays={4}
        tiles={tiles}
      />,
    );

    expect(screen.getByText("Poster A")).toBeInTheDocument();
    expect(
      screen.getByText("Most popular pick — 75% picked the same"),
    ).toBeInTheDocument();
  });

  it("renders a count tile as a raw number with no percent suffix", () => {
    const tiles: ResultTile[] = [
      { kind: "count", labelKey: "result.statPlays", value: 12 },
    ];
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        format="nxn"
        shared={false}
        // Deliberately different from the tile's own value (12) — the new
        // compact rounds/total-plays row (T10) also renders a raw number, and
        // a collision would make getByText("12") ambiguous.
        totalRounds={3}
        totalPlays={99}
        tiles={tiles}
      />,
    );

    expect(screen.getByText("12", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Plays recorded")).toBeInTheDocument();
    expect(screen.queryByText("12%")).not.toBeInTheDocument();
  });

  it("does not render the richer stat-tile row at all when tiles is empty", () => {
    const { container } = render(
      <ResultHero
        packTitle="Best Anime Openings"
        format="save_one"
        shared={false}
        totalRounds={2}
        totalPlays={4}
        tiles={[]}
      />,
    );

    expect(container.querySelector(".rounded-card")).toBeNull();
  });
});
