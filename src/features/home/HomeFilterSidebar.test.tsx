import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
    sort: "relevance" as const,
    onSortChange: vi.fn(),
    window: "week" as const,
    onWindowChange: vi.fn(),
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
    renderSidebar({ sort: "relevance" });
    expect(
      screen.queryByRole("button", { name: "Month" }),
    ).not.toBeInTheDocument();
  });

  it("shows the popularity window row when Popular is active", () => {
    renderSidebar({ sort: "popular" });
    expect(screen.getByRole("button", { name: "Month" })).toBeInTheDocument();
  });

  it("lifts search input changes to the parent", async () => {
    const user = userEvent.setup();
    const { onSearchChange } = renderSidebar();

    await user.type(screen.getByRole("searchbox"), "a");

    expect(onSearchChange).toHaveBeenCalledWith("a");
  });
});
