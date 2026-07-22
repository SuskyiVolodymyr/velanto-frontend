import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { PlayHeader } from "./PlayHeader";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/packs/pack-a/play",
}));

describe("PlayHeader", () => {
  it("names the pack as the page's h1, beside the back control", () => {
    render(<PlayHeader packId="pack-a" title="Best Anime Openings" />);

    // Level 1 specifically: the round headings inside every play screen are
    // h2s under this one, so a play page has exactly one h1 and it says which
    // pack you are playing.
    expect(
      screen.getByRole("heading", { level: 1, name: "Best Anime Openings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute(
      "href",
      "/packs/pack-a",
    );
  });

  it("truncates a long title beside the back button, but wraps it below sm", () => {
    render(
      <PlayHeader
        packId="pack-a"
        title="Rank Blind: Anime Openings Year by Year (2000-2026)"
      />,
    );
    const heading = screen.getByRole("heading", { level: 1 });

    // From `sm` up the title shares a row with Back, so it clips rather than
    // growing the row and pushing the game down the page. On a phone it sits
    // under Back with the full width to itself — truncating there ate most of
    // a real title ("Rank Blind: Anime Ope…"), so it wraps instead.
    expect(heading).toHaveClass("sm:truncate");
    expect(heading).not.toHaveClass("truncate");
  });
});
