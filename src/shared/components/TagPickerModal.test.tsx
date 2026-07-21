import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
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

  it("commits the drafted additions and closes when Apply is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <TagPickerModal
        open
        onClose={onClose}
        selected={["Anime"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Music" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onChange).toHaveBeenCalledWith(["Anime", "Music"]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("commits drafted removals when Apply is clicked", async () => {
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
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onChange).toHaveBeenCalledWith(["Music"]);
  });

  it("tracks the draft in the live count, and Clear empties it but only commits on Apply", async () => {
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
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Gaming" }));
    expect(screen.getByText("3 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Anime" })).not.toBeChecked();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("disables Clear when the draft is already empty", () => {
    render(
      <TagPickerModal
        open
        onClose={vi.fn()}
        selected={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("never commits while drafting, and Cancel discards the draft without committing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <TagPickerModal
        open
        onClose={onClose}
        selected={["Anime"]}
        onChange={onChange}
      />,
    );

    // Drafting alone does not call onChange — only Apply commits.
    await user.click(screen.getByRole("checkbox", { name: "Music" }));
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
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
