import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("exposes the value via progressbar aria attributes", () => {
    render(<ProgressBar value={27} ariaLabel="Round 3 of 11" />);
    const bar = screen.getByRole("progressbar", { name: "Round 3 of 11" });
    expect(bar).toHaveAttribute("aria-valuenow", "27");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps out-of-range values", () => {
    const { rerender } = render(<ProgressBar value={150} ariaLabel="p" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    rerender(<ProgressBar value={-20} ariaLabel="p" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("defaults to the bar size: h-1, pill-rounded", () => {
    render(<ProgressBar value={40} ariaLabel="p" />);
    const classes = screen.getByRole("progressbar").className.split(" ");
    expect(classes).toContain("h-1");
    expect(classes).toContain("rounded-pill");
  });

  it('size="rail" renders a square-ended 3px rail with no rounded-pill', () => {
    render(<ProgressBar value={40} ariaLabel="p" size="rail" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.className.split(" ")).toContain("h-[3px]");
    expect(bar.className).not.toMatch(/\brounded-pill\b/);
    expect(bar.className.split(" ")).not.toContain("h-1");
  });

  it("keeps the progressbar role and aria-valuenow clamping for both sizes", () => {
    const { rerender } = render(
      <ProgressBar value={150} ariaLabel="p" size="bar" />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    rerender(<ProgressBar value={-20} ariaLabel="p" size="rail" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });
});
