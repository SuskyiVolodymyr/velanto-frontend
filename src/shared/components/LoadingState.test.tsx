import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("announces a busy status region", () => {
    render(<LoadingState label="Loading feedback" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("includes its label for screen readers even when the label is hidden", () => {
    render(<LoadingState label="Loading feedback" />);
    const label = screen.getByText("Loading feedback");
    expect(label).toHaveClass("sr-only");
  });

  it("shows the label text visibly when showLabel is set", () => {
    render(<LoadingState label="Loading feedback" showLabel />);
    expect(screen.getByText("Loading feedback")).not.toHaveClass("sr-only");
  });

  it("renders a spinner", () => {
    const { container } = render(<LoadingState label="Loading" />);
    expect(container.querySelector("svg")).toHaveClass("animate-spin");
  });
});
