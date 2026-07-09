import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renders a textarea with an accessible name via aria-label", () => {
    render(<Textarea aria-label="Body" />);
    expect(screen.getByRole("textbox", { name: "Body" })).toBeInTheDocument();
  });

  it("forwards a ref to the underlying textarea element", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} aria-label="Body" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("applies the rows prop", () => {
    render(<Textarea aria-label="Body" rows={6} />);
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveAttribute("rows", "6");
  });

  it("merges a custom className with the defaults", () => {
    render(<Textarea aria-label="Body" className="custom-class" />);
    const el = screen.getByRole("textbox", { name: "Body" });
    expect(el).toHaveClass("custom-class");
    expect(el).toHaveClass("bg-surface");
  });

  it("calls onChange as the user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea aria-label="Body" onChange={onChange} />);

    await user.type(screen.getByRole("textbox", { name: "Body" }), "hi");

    expect(onChange).toHaveBeenCalled();
  });

  it("does not accept input when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea aria-label="Body" disabled onChange={onChange} />);

    await user.type(screen.getByRole("textbox", { name: "Body" }), "hi");

    expect(onChange).not.toHaveBeenCalled();
  });
});
