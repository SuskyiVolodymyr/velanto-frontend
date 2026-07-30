import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ResultHero } from "./ResultHero";

describe("ResultHero", () => {
  it("renders the RUN COMPLETE eyebrow label", () => {
    render(
      <ResultHero
        format="save_one"
        shared={false}
        totalRounds={2}
        totalPlays={4}
      />,
    );

    expect(screen.getByText("Run complete")).toBeInTheDocument();
  });

  it("renders the format-aware own-result title as an h1 for save_one", () => {
    render(
      <ResultHero
        format="save_one"
        shared={false}
        totalRounds={2}
        totalPlays={4}
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
        format="sacrifice_one"
        shared={false}
        totalRounds={2}
        totalPlays={4}
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
      <ResultHero format="save_one" shared totalRounds={2} totalPlays={4} />,
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

  // Code review: the subtitle used to say "Your picks are recorded…"
  // unconditionally, right below an h1 that was already shared-aware — a
  // shared reader was told THEIR picks were recorded, about a run they
  // never played.
  it("uses third-person subtitle copy on a shared result", () => {
    render(
      <ResultHero format="save_one" shared totalRounds={2} totalPlays={4} />,
    );

    expect(screen.getByText(/Their picks are recorded/)).toBeInTheDocument();
    expect(screen.queryByText(/Your picks are recorded/)).not.toBeInTheDocument();
  });

  // The pack title is NOT rendered here — it moved to ResultScreen's sticky
  // chrome bar (matches the mock, which never puts it in the hero).
  it("renders the fixed subtitle copy without the pack title, and not as the h1", () => {
    render(
      <ResultHero format="save_one" shared={false} totalRounds={2} totalPlays={4} />,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).not.toHaveTextContent("Best Anime Openings");
    expect(screen.queryByText(/Best Anime Openings/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/recorded and folded into this pack's stats/),
    ).toBeInTheDocument();
  });

  it("renders the compact rounds/total-plays stat row", () => {
    render(
      <ResultHero
        format="save_one"
        shared={false}
        totalRounds={8}
        totalPlays={42}
      />,
    );

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Rounds")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Total plays")).toBeInTheDocument();
  });

  // Mock (`Results.dc.html`): the hero is a single gradient card with the
  // check icon, message and heroStats — nothing else on the page belongs to
  // it. The D5 stat-tile row that used to render below it was a deliberate
  // addition beyond the mock; removed to match the mock exactly.
  it("renders as a single self-contained card with no extra rows below it", () => {
    const { container } = render(
      <ResultHero format="save_one" shared={false} totalRounds={2} totalPlays={4} />,
    );

    expect(container.children).toHaveLength(1);
  });
});
