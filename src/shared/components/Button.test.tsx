import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Submit
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows a spinner, disables itself, and marks aria-busy when loading", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button", { name: /Save/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn.querySelector("svg")).toHaveClass("animate-spin");
  });

  it("does not call onClick when loading (prevents double-submit)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: /Save/ }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("still renders its label alongside the spinner while loading", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button", { name: /Save/ })).toHaveTextContent(
      "Save",
    );
  });

  // `lg` is the play screens' shared 52px confirm-button size — a real size
  // variant (not a `className` override fighting `baseClasses`, which `cn()`
  // can't resolve since it's a plain join, not tailwind-merge). Its own
  // `sizeClasses` entry must carry the radius too: `md`/`sm`/`xs` use
  // `rounded-control`, `lg` uses `rounded-tile`.
  it("applies the lg size's 52px height, rounded-tile radius, and padding", () => {
    render(<Button size="lg">Next round →</Button>);
    const btn = screen.getByRole("button", { name: "Next round →" });
    expect(btn).toHaveClass("h-[52px]");
    expect(btn).toHaveClass("rounded-tile");
    expect(btn).toHaveClass("px-[30px]");
    expect(btn).toHaveClass("text-[15.5px]");
    expect(btn).not.toHaveClass("rounded-control");
  });

  it("keeps native disabled (not aria-disabled) on an lg-size button", () => {
    const onClick = vi.fn();
    render(
      <Button size="lg" disabled onClick={onClick}>
        Next round →
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Next round →" });
    expect(btn).toBeDisabled();
    expect(btn).not.toHaveAttribute("aria-disabled");
  });
});
