import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ResultActions } from "./ResultActions";

// T12: the Share button moved into the aside's consolidated ResultAgainPanel
// card — see that file's tests for the share-link-building behaviour
// (play-id vs encoded-picks fallback). This sticky-bar action is now just
// the quick play-again/try-it-yourself link.
describe("ResultActions", () => {
  it("shows a Play again link for an approved pack", () => {
    render(<ResultActions packId="p1" />);
    expect(screen.getByRole("link", { name: "Play again" })).toHaveAttribute(
      "href",
      "/packs/p1/play",
    );
  });

  it("invites a shared-result reader to try the pack rather than replay it", () => {
    // They are looking at someone else's run and have not played at all, so
    // "Play again" was telling them to repeat something they never did.
    render(<ResultActions packId="p1" shared />);
    expect(
      screen.getByRole("link", { name: "Try it yourself" }),
    ).toHaveAttribute("href", "/packs/p1/play");
    expect(screen.queryByRole("link", { name: "Play again" })).toBeNull();
  });
});
