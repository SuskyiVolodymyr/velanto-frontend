import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChip } from "./FilterChip";

describe("FilterChip", () => {
  it("reflects selected state via aria-pressed", () => {
    const { rerender } = render(
      <FilterChip label="Save One" selected={false} onToggle={vi.fn()} />,
    );
    const chip = screen.getByRole("button", {
      name: "Save One",
      pressed: false,
    });
    expect(chip).toBeInTheDocument();

    rerender(<FilterChip label="Save One" selected onToggle={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Save One", pressed: true }),
    ).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<FilterChip label="NxN" selected={false} onToggle={onToggle} />);

    await user.click(screen.getByRole("button", { name: "NxN" }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not call onToggle when disabled", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <FilterChip label="NxN" selected={false} onToggle={onToggle} disabled />,
    );

    await user.click(screen.getByRole("button", { name: "NxN" }));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
