import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepHeader } from "./StepHeader";

describe("StepHeader", () => {
  // Mock (Create Pack.dc.html): section headers are a small-caps cyan label
  // (font-size:12px, weight:700, letter-spacing:.14em, color:#00E5FF) with no
  // numbered badge — not the numbered-circle treatment this app had instead.
  it("renders an h2 with the given title, uppercase and accent-colored, with no step number", () => {
    render(<StepHeader title="Basics" />);

    const heading = screen.getByRole("heading", { level: 2, name: "Basics" });
    expect(heading).toHaveClass("uppercase", "text-acc");
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("renders the hint paragraph when a hint is passed", () => {
    render(
      <StepHeader title="Pools" hint="Pools are reusable bags of items." />,
    );

    expect(
      screen.getByText("Pools are reusable bags of items."),
    ).toBeInTheDocument();
  });

  it("does not render a hint paragraph when hint is omitted", () => {
    const { container } = render(<StepHeader title="Format" />);

    // No paragraph other than the aside/hint slot should exist.
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders the aside slot when passed", () => {
    render(<StepHeader title="Pools" aside="4 items" />);

    expect(screen.getByText("4 items")).toBeInTheDocument();
  });
});
