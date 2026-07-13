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
});
