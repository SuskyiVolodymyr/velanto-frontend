import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders a spinning indicator", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveClass("animate-spin");
  });

  it("is decorative (aria-hidden) so it adds no screen-reader noise", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("applies the requested size", () => {
    const { container } = render(<Spinner size={32} />);
    expect(container.querySelector("svg")).toHaveAttribute("width", "32");
  });
});
