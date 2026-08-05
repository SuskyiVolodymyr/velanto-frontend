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

  // Tags and language used to share one unnamed "Filters" popover. Each
  // dimension now has its own named trigger in the row, so what a control does
  // is readable without opening anything.
  it("gives tags and language their own named triggers in the row", () => {
    renderBar();

    expect(screen.getByRole("button", { name: /tags/i })).toBeInTheDocument();
    // The language control is the app's Dropdown (a combobox), sitting in the
    // row itself rather than nested inside another popover.
    expect(
      screen.getByRole("combobox", { name: /filter by language/i }),
    ).toBeInTheDocument();
  });

  it("shows the tag count on the Tags trigger once tags are picked", () => {
    renderBar({ tags: ["Anime", "Music"] });

    expect(screen.getByRole("button", { name: /tags/i })).toHaveTextContent(
      "2",
    );
  });

  it("keeps the sort choices behind the sort popover and lifts a change", async () => {
    const user = userEvent.setup();
    const { onSortChange } = renderBar();

    // The trigger carries BOTH halves of the current sort, so neither has to be
    // read out of an opened panel.
    const trigger = screen.getByRole("button", { name: /sort by/i });
    expect(trigger).toHaveTextContent("Sort by: Popular · Month");
    // The choices themselves stay hidden until it is opened.
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

    await user.click(screen.getByRole("button", { name: /sort by/i }));
    expect(
      screen.queryByRole("button", { name: "Month" }),
    ).not.toBeInTheDocument();
    // Date exposes the newest/oldest row instead.
    expect(
      screen.getByRole("button", { name: "Oldest first" }),
    ).toBeInTheDocument();
  });
});
