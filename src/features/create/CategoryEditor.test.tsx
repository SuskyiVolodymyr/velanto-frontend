import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryEditor } from "./CategoryEditor";
import type { Category } from "@/src/shared/types/pack";

function emptyCategory(): Category {
  return { id: "ca", name: "", items: [] };
}

function StatefulCategoryEditor({
  initial,
  onChange,
}: {
  initial: Category;
  onChange: (category: Category) => void;
}) {
  const [category, setCategory] = useState(initial);
  return (
    <CategoryEditor
      category={category}
      index={0}
      onChange={(next) => {
        setCategory(next);
        onChange(next);
      }}
    />
  );
}

describe("CategoryEditor", () => {
  it("renames the category via onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulCategoryEditor initial={emptyCategory()} onChange={onChange} />);

    await user.type(screen.getByLabelText("Category 1 name"), "Boys");

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Boys" }));
  });

  it("adds a text item to the category", async () => {
    const user = userEvent.setup();
    const category = emptyCategory();
    const onChange = vi.fn();
    render(<CategoryEditor category={category} index={0} onChange={onChange} />);

    await user.type(screen.getByLabelText("Category 1 new item"), "Naruto");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ type: "text", title: "Naruto", value: "Naruto" })],
      }),
    );
  });

  it("removes an item from the category", async () => {
    const user = userEvent.setup();
    const category: Category = {
      id: "ca",
      name: "Boys",
      items: [{ id: "i1", type: "text", title: "Naruto", value: "Naruto" }],
    };
    const onChange = vi.fn();
    render(<CategoryEditor category={category} index={0} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Remove Naruto" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ items: [] }));
  });

  it("has no selectionMode or sampleSize controls (unlike GroupEditor)", () => {
    render(<CategoryEditor category={emptyCategory()} index={0} onChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Random" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manual" })).not.toBeInTheDocument();
  });
});
