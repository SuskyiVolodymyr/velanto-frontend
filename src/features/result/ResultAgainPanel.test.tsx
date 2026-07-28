import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ResultAgainPanel } from "./ResultAgainPanel";

describe("ResultAgainPanel", () => {
  it("renders the heading, body, and an explore link to home", () => {
    render(<ResultAgainPanel packId="pack-1" shared={false} />);

    expect(screen.getByText("Want another run?")).toBeInTheDocument();
    expect(
      screen.getByText("Rounds redraw from their pools each time you play."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore more packs" }),
    ).toHaveAttribute("href", "/");
  });

  it("links the play CTA at the pack's play route", () => {
    render(<ResultAgainPanel packId="pack-1" shared={false} />);

    expect(
      screen.getByRole("link", { name: "Play it again" }),
    ).toHaveAttribute("href", "/packs/pack-1/play");
  });

  // The panel's own accessible name is deliberately different from
  // ResultActions's sticky-bar CTA ("Play again" / "Try it yourself") — both
  // can be mounted at once, and identical accessible names on two different
  // links is the exact bug class a Critical finding caught in Create Pack.
  it("uses wording distinct from ResultActions's sticky-bar link", () => {
    render(<ResultAgainPanel packId="pack-1" shared={false} />);

    expect(screen.queryByText("Play again", { selector: "a" })).toBeNull();
  });

  it("switches to shared-appropriate wording when shared", () => {
    render(<ResultAgainPanel packId="pack-1" shared />);

    expect(
      screen.getByRole("link", { name: "Give it a go" }),
    ).toHaveAttribute("href", "/packs/pack-1/play");
    expect(screen.queryByText("Play it again")).toBeNull();
    expect(screen.queryByText("Try it yourself")).toBeNull();
  });
});
