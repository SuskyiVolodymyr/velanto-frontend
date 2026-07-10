import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("hides the Share result button for a non-approved pack", () => {
    render(<ResultActions packId="p1" status="pending" picks={null} />);
    expect(
      screen.queryByRole("button", { name: "Share result" }),
    ).not.toBeInTheDocument();
  });
});
