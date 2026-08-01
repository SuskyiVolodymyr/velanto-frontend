import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("exposes a switch with aria-checked reflecting `checked`", () => {
    const { rerender } = render(
      <Toggle checked={false} onChange={vi.fn()} ariaLabel="Stream safety" />,
    );
    const sw = screen.getByRole("switch", { name: "Stream safety" });
    expect(sw).toHaveAttribute("aria-checked", "false");

    rerender(
      <Toggle checked onChange={vi.fn()} ariaLabel="Stream safety" />,
    );
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with the toggled value when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} ariaLabel="Notify" />);

    await user.click(screen.getByRole("switch", { name: "Notify" }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not call onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Toggle checked={false} onChange={onChange} ariaLabel="Notify" disabled />,
    );

    await user.click(screen.getByRole("switch", { name: "Notify" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
