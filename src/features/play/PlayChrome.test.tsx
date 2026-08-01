import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PlayChrome } from "./PlayChrome";
import type { Pack } from "@/src/shared/types/pack";

const PACK: Pack = {
  id: "pack-a",
  title: "Best Anime Openings",
  description: "Pick your favorite each round.",
  coverTone: "#2b2a3a",
  language: "en",
  format: "save_one",
  tags: ["Anime"],
  groups: [],
  rounds: [{ id: "r1" }, { id: "r2" }] as Pack["rounds"],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
} as unknown as Pack;

describe("PlayChrome", () => {
  it("renders the pack title as the page's h1", () => {
    render(
      <PlayChrome
        pack={PACK}
        isFinished={false}
        roundIndex={0}
        totalRounds={2}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Best Anime Openings" }),
    ).toBeInTheDocument();
  });

  it("renders the round counter with the current/total round", () => {
    render(
      <PlayChrome
        pack={PACK}
        isFinished={false}
        roundIndex={0}
        totalRounds={2}
      />,
    );

    // e2e/play.spec.ts asserts this exact string, unchanged from PlayProgress.
    expect(screen.getByText("Round 1 of 2")).toBeInTheDocument();
  });

  it("omits the counter entirely when the screen carries its own", () => {
    // The mock's sticky bar has no round counter — it lives in the round
    // header's eyebrow. Screens whose PlayRoundHeader already shows it opt out
    // here rather than printing it twice on one page.
    render(
      <PlayChrome
        pack={PACK}
        isFinished={false}
        roundIndex={0}
        totalRounds={2}
        showRoundCounter={false}
      />,
    );

    expect(screen.queryByText("Round 1 of 2")).not.toBeInTheDocument();
  });

  it("still hides the finished label when the counter is opted out", () => {
    render(
      <PlayChrome
        pack={PACK}
        isFinished
        roundIndex={1}
        totalRounds={2}
        showRoundCounter={false}
      />,
    );

    expect(screen.queryByText("Complete")).not.toBeInTheDocument();
  });

  it("shows play.complete instead of the round counter when finished", () => {
    render(
      <PlayChrome pack={PACK} isFinished roundIndex={1} totalRounds={2} />,
    );

    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.queryByText(/Round \d of \d/)).not.toBeInTheDocument();
  });

  it("renders an icon-only back button pointing at the pack", () => {
    render(
      <PlayChrome
        pack={PACK}
        isFinished={false}
        roundIndex={0}
        totalRounds={2}
      />,
    );

    expect(screen.getByRole("link", { name: "Exit" })).toHaveAttribute(
      "href",
      "/packs/pack-a",
    );
  });

  it("renders a SOLO mode chip", () => {
    render(
      <PlayChrome
        pack={PACK}
        isFinished={false}
        roundIndex={0}
        totalRounds={2}
      />,
    );

    expect(screen.getByText("SOLO")).toBeInTheDocument();
  });

  it("renders a format + round-count meta line", () => {
    render(
      <PlayChrome
        pack={PACK}
        isFinished={false}
        roundIndex={0}
        totalRounds={2}
      />,
    );

    expect(screen.getByText("Save One · 2 rounds")).toBeInTheDocument();
  });
});
