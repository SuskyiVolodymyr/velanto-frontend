import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = [
  { value: "one", label: "One" },
  { value: "two", label: "Two" },
  { value: "three", label: "Three" },
];

describe("SegmentedControl", () => {
  it("renders a radiogroup of radios with an accessible group name", () => {
    render(<SegmentedControl options={OPTIONS} value="one" onChange={vi.fn()} ariaLabel="Pick one" />);
    expect(screen.getByRole("radiogroup", { name: "Pick one" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("wires id, aria-describedby and aria-invalid onto the radiogroup", () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="one"
        onChange={vi.fn()}
        ariaLabel="Pick one"
        id="topic"
        aria-describedby="topic-error"
        aria-invalid
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Pick one" });
    expect(group).toHaveAttribute("id", "topic");
    expect(group).toHaveAttribute("aria-describedby", "topic-error");
    expect(group).toHaveAttribute("aria-invalid", "true");
  });

  it("marks the selected option with aria-checked", () => {
    render(<SegmentedControl options={OPTIONS} value="two" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Two" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "One" })).not.toBeChecked();
  });

  it("gives only the selected radio a tab stop (roving tabindex)", () => {
    render(<SegmentedControl options={OPTIONS} value="two" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Two" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "One" })).toHaveAttribute("tabindex", "-1");
  });

  it("calls onChange when an option is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="one" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Three" }));

    expect(onChange).toHaveBeenCalledWith("three");
  });

  it("moves selection to the next option with ArrowRight", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="one" onChange={onChange} />);

    screen.getByRole("radio", { name: "One" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith("two");
  });

  it("wraps from the last option to the first with ArrowRight", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="three" onChange={onChange} />);

    screen.getByRole("radio", { name: "Three" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith("one");
  });

  it("moves to the previous option with ArrowLeft", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="two" onChange={onChange} />);

    screen.getByRole("radio", { name: "Two" }).focus();
    await user.keyboard("{ArrowLeft}");

    expect(onChange).toHaveBeenCalledWith("one");
  });

  it("skips disabled options during keyboard navigation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const opts = [
      { value: "one", label: "One" },
      { value: "two", label: "Two", disabled: true },
      { value: "three", label: "Three" },
    ];
    render(<SegmentedControl options={opts} value="one" onChange={onChange} />);

    screen.getByRole("radio", { name: "One" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith("three");
  });

  it("does not select a disabled option on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const opts = [
      { value: "one", label: "One" },
      { value: "two", label: "Two", disabled: true },
    ];
    render(<SegmentedControl options={opts} value="one" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Two" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
