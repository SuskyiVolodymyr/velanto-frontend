import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FeedbackFilters } from "./FeedbackFilters";

function renderFilters(
  overrides: Partial<React.ComponentProps<typeof FeedbackFilters>> = {},
) {
  const props: React.ComponentProps<typeof FeedbackFilters> = {
    searchInput: "",
    onSearchInputChange: vi.fn(),
    topic: undefined,
    onTopicChange: vi.fn(),
    statusFilter: undefined,
    onStatusChange: vi.fn(),
    sort: "new",
    onSortChange: vi.fn(),
    ...overrides,
  };
  render(<FeedbackFilters {...props} />);
}

describe("FeedbackFilters", () => {
  it("renders 'All' as selected in both the topic and status rows by default", () => {
    renderFilters();
    const allButtons = screen.getAllByRole("button", { name: "All" });
    expect(allButtons).toHaveLength(2);
    for (const button of allButtons) {
      expect(button).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("clicking a topic chip calls onTopicChange with that topic", async () => {
    const onTopicChange = vi.fn();
    renderFilters({ onTopicChange });
    await userEvent.click(screen.getByRole("button", { name: "Feature" }));
    expect(onTopicChange).toHaveBeenCalledWith("feature");
  });

  it("clicking 'All' in the topic row after a topic is active calls onTopicChange(undefined)", async () => {
    const onTopicChange = vi.fn();
    renderFilters({ topic: "feature", onTopicChange });
    const [topicAll] = screen.getAllByRole("button", { name: "All" });
    await userEvent.click(topicAll);
    expect(onTopicChange).toHaveBeenCalledWith(undefined);
  });

  it("clicking a status chip calls onStatusChange with that status", async () => {
    const onStatusChange = vi.fn();
    renderFilters({ onStatusChange });
    await userEvent.click(screen.getByRole("button", { name: "In progress" }));
    expect(onStatusChange).toHaveBeenCalledWith("in_progress");
  });

  it("clicking 'All' in the status row after a status is active calls onStatusChange(undefined)", async () => {
    const onStatusChange = vi.fn();
    renderFilters({ statusFilter: "in_progress", onStatusChange });
    const [, statusAll] = screen.getAllByRole("button", { name: "All" });
    await userEvent.click(statusAll);
    expect(onStatusChange).toHaveBeenCalledWith(undefined);
  });

  it("clicking a sort chip calls onSortChange directly (no 'all' sentinel to translate)", async () => {
    const onSortChange = vi.fn();
    renderFilters({ onSortChange });
    await userEvent.click(screen.getByRole("button", { name: "Top" }));
    expect(onSortChange).toHaveBeenCalledWith("top");
  });
});
