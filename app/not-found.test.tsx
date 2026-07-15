import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import NotFound from "./not-found";

describe("app not-found (404)", () => {
  it("renders the 404 heading, body, and a link home", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to discover" }),
    ).toHaveAttribute("href", "/");
  });
});
