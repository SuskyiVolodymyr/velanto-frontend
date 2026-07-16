import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChipMultiSelect } from "./ChipMultiSelect";

const OPTIONS = [
  { value: "en", label: "English" },
  { value: "uk", label: "Українська" },
  { value: "es", label: "Español" },
];

describe("ChipMultiSelect", () => {
  it("renders one toggle per option, none selected by default", () => {
    render(
      <ChipMultiSelect
        options={OPTIONS}
        selected={[]}
        onChange={vi.fn()}
        groupLabel="Language"
      />,
    );
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(3);
    expect(boxes.every((b) => !(b as HTMLInputElement).checked)).toBe(true);
  });

  it("reflects the selected values", () => {
    render(
      <ChipMultiSelect
        options={OPTIONS}
        selected={["uk"]}
        onChange={vi.fn()}
        groupLabel="Language"
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Українська" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "English" })).not.toBeChecked();
  });

  it("adds a value when an unselected chip is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ChipMultiSelect
        options={OPTIONS}
        selected={["uk"]}
        onChange={onChange}
        groupLabel="Language"
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "English" }));

    expect(onChange).toHaveBeenCalledWith(["uk", "en"]);
  });

  it("removes a value when a selected chip is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ChipMultiSelect
        options={OPTIONS}
        selected={["uk", "en"]}
        onChange={onChange}
        groupLabel="Language"
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Українська" }));

    expect(onChange).toHaveBeenCalledWith(["en"]);
  });

  // The chips look like buttons but ARE checkboxes, which is the whole point:
  // a keyboard user gets real multi-select semantics rather than a row of
  // toggle-buttons a screen reader announces as unrelated.
  it("is operable by keyboard, and grouped for screen readers", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ChipMultiSelect
        options={OPTIONS}
        selected={[]}
        onChange={onChange}
        groupLabel="Language"
      />,
    );

    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole("checkbox", { name: "English" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(["en"]);
  });
});
