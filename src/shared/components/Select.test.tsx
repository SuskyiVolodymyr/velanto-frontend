import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./Select";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma", disabled: true },
];

describe("Select", () => {
  it("renders options from the options prop", () => {
    render(<Select aria-label="Pick" options={OPTIONS} defaultValue="a" />);
    const select = screen.getByRole("combobox", { name: "Pick" });
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Gamma" })).toBeDisabled();
  });

  it("renders children when no options prop is given", () => {
    render(
      <Select aria-label="Pick" defaultValue="x">
        <option value="x">Ex</option>
        <option value="y">Why</option>
      </Select>,
    );
    expect(screen.getByRole("option", { name: "Ex" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Why" })).toBeInTheDocument();
  });

  it("forwards a ref to the underlying select element", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select ref={ref} aria-label="Pick" options={OPTIONS} defaultValue="a" />,
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it("calls onChange with the chosen value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Pick"
        options={OPTIONS}
        value="a"
        onChange={onChange}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Pick" }),
      "b",
    );

    expect(onChange).toHaveBeenCalled();
  });

  it("supports an accessible name via id + label association", () => {
    render(
      <>
        <label htmlFor="fruit">Fruit</label>
        <Select id="fruit" options={OPTIONS} defaultValue="a" />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Fruit" })).toBeInTheDocument();
  });

  it("is disabled when the disabled prop is set", () => {
    render(
      <Select aria-label="Pick" options={OPTIONS} defaultValue="a" disabled />,
    );
    expect(screen.getByRole("combobox", { name: "Pick" })).toBeDisabled();
  });
});
