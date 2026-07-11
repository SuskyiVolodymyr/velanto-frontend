import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { TagFilter } from "./TagFilter";

describe("TagFilter", () => {
  it("shows the default label and no active chips when nothing is selected", () => {
    render(<TagFilter tags={[]} onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Filter by tags" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Active tag filters" }),
    ).not.toBeInTheDocument();
  });

  it("renders each active tag as a removable chip", () => {
    render(<TagFilter tags={["Anime", "Music"]} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "2 tags" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Anime filter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Music filter" }),
    ).toBeInTheDocument();
  });

  it("removes just that tag (applying immediately) when its chip is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagFilter tags={["Anime", "Music"]} onChange={onChange} />);

    await user.click(
      screen.getByRole("button", { name: "Remove Anime filter" }),
    );

    expect(onChange).toHaveBeenCalledWith(["Music"]);
  });
});
