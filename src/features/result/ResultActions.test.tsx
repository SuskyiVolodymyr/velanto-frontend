import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ResultActions } from "./ResultActions";

describe("ResultActions", () => {
  it("shows Play again and a Share result button for an approved pack", () => {
    render(<ResultActions packId="p1" status="approved" picks={null} />);
    expect(screen.getByRole("link", { name: "Play again" })).toHaveAttribute(
      "href",
      "/packs/p1/play",
    );
    expect(
      screen.getByRole("button", { name: "Share result" }),
    ).toBeInTheDocument();
  });

  it("invites a shared-result reader to try the pack rather than replay it", () => {
    // They are looking at someone else's run and have not played at all, so
    // "Play again" was telling them to repeat something they never did.
    render(<ResultActions packId="p1" status="approved" picks={null} shared />);
    expect(
      screen.getByRole("link", { name: "Try it yourself" }),
    ).toHaveAttribute("href", "/packs/p1/play");
    expect(screen.queryByRole("link", { name: "Play again" })).toBeNull();
  });

  it("hides the Share result button for a non-approved pack", () => {
    render(<ResultActions packId="p1" status="pending" picks={null} />);
    expect(
      screen.queryByRole("button", { name: "Share result" }),
    ).not.toBeInTheDocument();
  });
});
