import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { HomeFilterSidebar } from "./HomeFilterSidebar";

function renderSidebar(
  overrides: Partial<Parameters<typeof HomeFilterSidebar>[0]> = {},
) {
  const props = {
    search: "",
    onSearchChange: vi.fn(),
    format: "all" as const,
    onFormatChange: vi.fn(),
    sort: "popular" as const,
    onSortChange: vi.fn(),
    window: "week" as const,
    onWindowChange: vi.fn(),
    dateOrder: "newest" as const,
    onDateOrderChange: vi.fn(),
    tags: [],
    onTagsChange: vi.fn(),
    ...overrides,
  };
  render(<HomeFilterSidebar {...props} />);
  return props;
}

describe("HomeFilterSidebar", () => {
  it("renders the search box and every filter group in one panel", () => {
    renderSidebar();

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Filters" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Format" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sort by" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tags" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filter by tags" }),
    ).toBeInTheDocument();
  });

  it("hides the popularity window row unless Popular is the active sort", () => {
    renderSidebar({ sort: "date" });
    expect(
      screen.queryByRole("button", { name: "Month" }),
    ).not.toBeInTheDocument();
  });

  it("shows the popularity window row when Popular is active", () => {
    renderSidebar({ sort: "popular" });
    expect(screen.getByRole("button", { name: "Month" })).toBeInTheDocument();
  });

  it("offers exactly the two top-level sorts in a dropdown (no Relevance)", () => {
    renderSidebar();

    const select = screen.getByRole("combobox", { name: "Sort by" });
    expect(
      [...select.querySelectorAll("option")].map((o) => o.textContent),
    ).toEqual(["Popular", "Date"]);
  });

  it("lifts a sort change from the dropdown to the parent", async () => {
    const user = userEvent.setup();
    const { onSortChange } = renderSidebar();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort by" }),
      "date",
    );

    expect(onSortChange).toHaveBeenCalledWith("date");
  });

  it("hides the newest/oldest row unless Date is the active sort", () => {
    renderSidebar({ sort: "popular" });

    expect(
      screen.queryByRole("button", { name: "Newest first" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Oldest first" }),
    ).not.toBeInTheDocument();
  });

  it("shows the newest/oldest row when Date is active", () => {
    renderSidebar({ sort: "date" });

    expect(
      screen.getByRole("button", { name: "Newest first" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Oldest first" }),
    ).toBeInTheDocument();
    // The two sub-rows are mutually exclusive.
    expect(
      screen.queryByRole("button", { name: "Month" }),
    ).not.toBeInTheDocument();
  });

  it("lifts a date-order change to the parent", async () => {
    const user = userEvent.setup();
    const { onDateOrderChange } = renderSidebar({ sort: "date" });

    await user.click(screen.getByRole("button", { name: "Oldest first" }));

    expect(onDateOrderChange).toHaveBeenCalledWith("oldest");
  });

  it("lifts search input changes to the parent", async () => {
    const user = userEvent.setup();
    const { onSearchChange } = renderSidebar();

    await user.type(screen.getByRole("searchbox"), "a");

    expect(onSearchChange).toHaveBeenCalledWith("a");
  });
});
