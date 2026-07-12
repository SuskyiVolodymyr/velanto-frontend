import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders a pulsing placeholder block", () => {
    const { container } = render(<Skeleton />);
    const block = container.firstElementChild;
    expect(block).toHaveClass("animate-pulse");
  });

  it("is hidden from screen readers (decorative placeholder)", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("merges extra classes for sizing", () => {
    render(<Skeleton className="h-8 w-40" data-testid="s" />);
    const block = screen.getByTestId("s");
    expect(block).toHaveClass("h-8");
    expect(block).toHaveClass("w-40");
  });
});
