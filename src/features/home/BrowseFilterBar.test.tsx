import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { BrowseFilterBar } from "./BrowseFilterBar";

function renderBar(
  overrides: Partial<Parameters<typeof BrowseFilterBar>[0]> = {},
) {
  const props = {
    format: "all" as const,
    onFormatChange: vi.fn(),
    sort: "popular" as const,
    onSortChange: vi.fn(),
    window: "month" as const,
    onWindowChange: vi.fn(),
    dateOrder: "newest" as const,
    onDateOrderChange: vi.fn(),
    tags: [],
    onTagsChange: vi.fn(),
    languages: [],
    onLanguagesChange: vi.fn(),
    ...overrides,
  };
  render(<BrowseFilterBar {...props} />);
  return props;
}

describe("BrowseFilterBar", () => {
  it("shows the format pills inline and lifts a format choice", async () => {
    const user = userEvent.setup();
    const { onFormatChange } = renderBar();

    // "All formats" + every real format is a visible pill.
    expect(
      screen.getByRole("button", { name: "All formats" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sacrifice One" }));
    expect(onFormatChange).toHaveBeenCalledWith("sacrifice_one");
  });

  it("keeps tags and language behind the Filters popover", async () => {
    const user = userEvent.setup();
    renderBar();

    // Closed by default.
    expect(
      screen.queryByRole("button", { name: "Filter by tags" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /filter by language/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filters" }));

    expect(
      screen.getByRole("button", { name: "Filter by tags" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /filter by language/i }),
    ).toBeInTheDocument();
  });

  it("keeps the sort choices behind the sort popover and lifts a change", async () => {
    const user = userEvent.setup();
    const { onSortChange } = renderBar();

    // The trigger's accessible name is the group; the active sort shows as text.
    const trigger = screen.getByRole("button", { name: "Sort by" });
    expect(trigger).toHaveTextContent("Popular");
    // Sort options are hidden until opened (the trigger text is not a choice).
    expect(
      screen.queryByRole("button", { name: "Date" }),
    ).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Date" }));

    expect(onSortChange).toHaveBeenCalledWith("date");
  });

  it("shows the popularity window row only under the Popular sort", async () => {
    const user = userEvent.setup();
    renderBar({ sort: "date" });

    await user.click(screen.getByRole("button", { name: "Sort by" }));
    expect(
      screen.queryByRole("button", { name: "Month" }),
    ).not.toBeInTheDocument();
    // Date exposes the newest/oldest row instead.
    expect(
      screen.getByRole("button", { name: "Oldest first" }),
    ).toBeInTheDocument();
  });
});
