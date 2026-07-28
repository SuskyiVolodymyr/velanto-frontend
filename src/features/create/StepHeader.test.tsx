import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepHeader } from "./StepHeader";

describe("StepHeader", () => {
  it("renders an h2 with the given title and the step number", () => {
    render(<StepHeader step={1} title="Basics" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Basics" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders the hint paragraph when a hint is passed", () => {
    render(
      <StepHeader
        step={3}
        title="Pools"
        hint="Pools are reusable bags of items."
      />,
    );

    expect(
      screen.getByText("Pools are reusable bags of items."),
    ).toBeInTheDocument();
  });

  it("does not render a hint paragraph when hint is omitted", () => {
    const { container } = render(<StepHeader step={2} title="Format" />);

    // No paragraph other than the aside/hint slot should exist.
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders the aside slot when passed", () => {
    render(<StepHeader step={3} title="Pools" aside="4 items" />);

    expect(screen.getByText("4 items")).toBeInTheDocument();
  });
});
