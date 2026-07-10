import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagPickerModal } from "./TagPickerModal";

describe("TagPickerModal", () => {
  it("renders every tag as a checkbox", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Anime" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Memes" })).toBeInTheDocument();
  });

  it("checks the boxes for already-selected tags", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime", "Gaming"]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Anime" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Gaming" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Music" })).not.toBeChecked();
  });

  it("calls onChange with the tag added when an unchecked box is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime"]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Music" }));
    expect(onChange).toHaveBeenCalledWith(["Anime", "Music"]);
  });

  it("calls onChange with the tag removed when a checked box is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime", "Music"]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Anime" }));
    expect(onChange).toHaveBeenCalledWith(["Music"]);
  });

  it("shows a live selected count", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime", "Music"]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("disables unchecked boxes once maxTags is reached", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime", "Music"]}
        onChange={vi.fn()}
        maxTags={2}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Gaming" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Anime" })).not.toBeDisabled();
  });

  it("does not disable any box when maxTags is not provided", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={["Anime", "Music"]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Gaming" })).not.toBeDisabled();
  });
});
