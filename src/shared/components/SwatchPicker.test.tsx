import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SwatchPicker } from "./SwatchPicker";

const colors = ["#2b2a3a", "#20303a", "#39d98a"];

describe("SwatchPicker", () => {
  it("renders a labelled button per swatch", () => {
    render(
      <SwatchPicker
        swatches={colors}
        value={colors[0]}
        onChange={() => {}}
        getLabel={(c) => `Tone ${c}`}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: "Tone #39d98a" }),
    ).toBeInTheDocument();
  });

  it("marks the selected swatch pressed and the others not", () => {
    render(
      <SwatchPicker
        swatches={colors}
        value={colors[1]}
        onChange={() => {}}
        getLabel={(c) => c}
      />,
    );
    expect(screen.getByRole("button", { name: "#20303a" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "#2b2a3a" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onChange with the clicked colour", async () => {
    const onChange = vi.fn();
    render(
      <SwatchPicker
        swatches={colors}
        value={colors[0]}
        onChange={onChange}
        getLabel={(c) => c}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "#39d98a" }));
    expect(onChange).toHaveBeenCalledWith("#39d98a");
  });

  it("shows the check glyph only on the selected swatch", () => {
    const { container } = render(
      <SwatchPicker
        swatches={colors}
        value={colors[0]}
        onChange={() => {}}
        getLabel={(c) => c}
      />,
    );
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });
});
