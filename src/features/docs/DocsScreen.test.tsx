import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocsScreen } from "./DocsScreen";

describe("DocsScreen", () => {
  it("shows the Getting started topic by default", () => {
    render(<DocsScreen />);

    expect(
      screen.getByRole("heading", { name: "What is Velanto?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Getting started" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("swaps to the Formats topic when its sidebar button is clicked", async () => {
    const user = userEvent.setup();
    render(<DocsScreen />);

    await user.click(screen.getByRole("button", { name: "Formats explained" }));

    expect(
      screen.getByRole("heading", { name: "The five formats" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "What is Velanto?" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Formats explained" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Getting started" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("lists all 5 elimination formats on the Formats topic", async () => {
    const user = userEvent.setup();
    render(<DocsScreen />);

    await user.click(screen.getByRole("button", { name: "Formats explained" }));

    for (const name of [
      "Save One",
      "Sacrifice One",
      "Rank Blind",
      "NxN",
      "1v1",
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });
});
