import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { BackButton } from "./BackButton";

describe("BackButton", () => {
  // #353: it used to pop the history stack and only fall back to this href when
  // there was nothing to pop, so the same control landed somewhere different
  // depending on the route taken to the page. The destination is now the
  // button's whole meaning, not its last resort.
  it("always links to the given destination", () => {
    render(<BackButton href="/feedback" />);

    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/feedback",
    );
  });

  // A fixed destination IS a link: middle-click, open-in-new-tab and the
  // browser's own status-bar preview all come free, and none of them worked
  // while this was a button running router.back().
  it("is a link rather than a button", () => {
    render(<BackButton href="/" />);

    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });
});
