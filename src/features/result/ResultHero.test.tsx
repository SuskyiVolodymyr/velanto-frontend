import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ResultHero } from "./ResultHero";
import type { ResultTile } from "./result-summary";

describe("ResultHero", () => {
  it("renders the eyebrow label", () => {
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        shared={false}
        totalPlays={4}
        tiles={[]}
      />,
    );

    expect(screen.getByText("Result")).toBeInTheDocument();
  });

  it("renders 'Your run is complete' as an h1 for an own result", () => {
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        shared={false}
        totalPlays={4}
        tiles={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Your run is complete" }),
    ).toBeInTheDocument();
  });

  it("renders the shared-variant title as the h1 when shared", () => {
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        shared
        totalPlays={4}
        tiles={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1 }),
    ).not.toHaveTextContent("Your run is complete");
    expect(
      screen.getByRole("heading", { level: 1, name: "This run is complete" }),
    ).toBeInTheDocument();
  });

  it("renders the pack title and playsRecorded text in the subtitle, not the h1", () => {
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        shared={false}
        totalPlays={4}
        tiles={[]}
      />,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).not.toHaveTextContent("Best Anime Openings");

    expect(screen.getByText(/Best Anime Openings/)).toBeInTheDocument();
    expect(screen.getByText(/4 plays recorded/)).toBeInTheDocument();
  });

  it("renders a percent tile with its value and label", () => {
    const tiles: ResultTile[] = [
      { kind: "percent", labelKey: "result.statAgreement", value: 62 },
    ];
    render(
      <ResultHero
        packTitle="Best Anime Openings"
        shared={false}
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
        shared={false}
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
        shared={false}
        totalPlays={12}
        tiles={tiles}
      />,
    );

    expect(screen.getByText("12", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Plays recorded")).toBeInTheDocument();
    expect(screen.queryByText("12%")).not.toBeInTheDocument();
  });

  it("does not render the stat-tile row at all when tiles is empty", () => {
    const { container } = render(
      <ResultHero
        packTitle="Best Anime Openings"
        shared={false}
        totalPlays={4}
        tiles={[]}
      />,
    );

    expect(container.querySelector(".rounded-card")).toBeNull();
  });
});
