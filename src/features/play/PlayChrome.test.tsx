import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PlayChrome } from "./PlayChrome";

describe("PlayChrome", () => {
  it("renders the pack title as the page's h1", () => {
    render(
      <PlayChrome
        packId="pack-a"
        title="Best Anime Openings"
        isFinished={false}
        roundIndex={0}
        totalRounds={2}
        progressPct={0}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Best Anime Openings" }),
    ).toBeInTheDocument();
  });

  it("renders the round counter with the current/total round", () => {
    render(
      <PlayChrome
        packId="pack-a"
        title="Best Anime Openings"
        isFinished={false}
        roundIndex={0}
        totalRounds={2}
        progressPct={0}
      />,
    );

    // e2e/play.spec.ts asserts this exact string, unchanged from PlayProgress.
    expect(screen.getByText("Round 1 of 2")).toBeInTheDocument();
  });

  it("shows play.complete instead of the round counter when finished", () => {
    render(
      <PlayChrome
        packId="pack-a"
        title="Best Anime Openings"
        isFinished
        roundIndex={1}
        totalRounds={2}
        progressPct={100}
      />,
    );

    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.queryByText(/Round \d of \d/)).not.toBeInTheDocument();
  });

  it("renders an Exit link pointing at the pack", () => {
    render(
      <PlayChrome
        packId="pack-a"
        title="Best Anime Openings"
        isFinished={false}
        roundIndex={0}
        totalRounds={2}
        progressPct={0}
      />,
    );

    expect(screen.getByRole("link", { name: "Exit" })).toHaveAttribute(
      "href",
      "/packs/pack-a",
    );
  });

  it("renders a progressbar whose aria-valuenow tracks progressPct", () => {
    render(
      <PlayChrome
        packId="pack-a"
        title="Best Anime Openings"
        isFinished={false}
        roundIndex={0}
        totalRounds={2}
        progressPct={50}
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });
});
