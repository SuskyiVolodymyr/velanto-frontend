import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ReportsTab } from "./ReportsTab";
import { reportsClient } from "@/src/shared/lib/reports-client";
import type { ReportWithReporter } from "@/src/shared/types/report";

vi.mock("@/src/shared/lib/reports-client", () => ({
  reportsClient: { list: vi.fn() },
}));

const REPORT: ReportWithReporter = {
  id: "r1",
  type: "pack",
  reason: "spam",
  comment: null,
  targetId: "pack-abcdef12",
  roundIndex: null,
  reporterId: "u1",
  reporterUsername: "watchdog",
  status: "new",
  reviewedById: null,
  closedById: null,
  createdAt: "2026-07-14T00:00:00.000Z",
};

function page(items: ReportWithReporter[], total = items.length) {
  return { items, total, page: 1, limit: 20 };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(reportsClient.list).mockResolvedValue(page([REPORT]));
});

describe("ReportsTab", () => {
  it("lists reports with a link into the detail screen's new home", async () => {
    render(<ReportsTab />);

    const link = await screen.findByRole("link", { name: /Pack pack-abc/ });
    expect(link).toHaveAttribute("href", "/moderation/reports/r1");
    expect(screen.getByText("watchdog")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    render(<ReportsTab />);

    await user.click(await screen.findByRole("button", { name: "Reviewing" }));

    await vi.waitFor(() =>
      expect(reportsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "reviewing" }),
      ),
    );
  });

  it("filters by type", async () => {
    const user = userEvent.setup();
    render(<ReportsTab />);

    await user.click(await screen.findByRole("button", { name: "Users" }));

    await vi.waitFor(() =>
      expect(reportsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "user" }),
      ),
    );
  });

  it("pages through the queue", async () => {
    vi.mocked(reportsClient.list).mockResolvedValue(page([REPORT], 40));
    const user = userEvent.setup();
    render(<ReportsTab />);

    await screen.findByText("watchdog");
    await user.click(screen.getByRole("button", { name: "Next" }));

    await vi.waitFor(() =>
      expect(reportsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
  });

  // A filter re-scopes the list, so a page number carried over from the old
  // result set can land past the end — an empty table for a queue that has work.
  it("returns to page 1 when a filter changes", async () => {
    vi.mocked(reportsClient.list).mockResolvedValue(page([REPORT], 40));
    const user = userEvent.setup();
    render(<ReportsTab />);

    await screen.findByText("watchdog");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await vi.waitFor(() =>
      expect(reportsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Closed" }));

    await vi.waitFor(() =>
      expect(reportsClient.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "closed", page: 1 }),
      ),
    );
  });

  it("says so when nothing matches, rather than showing an empty table", async () => {
    vi.mocked(reportsClient.list).mockResolvedValue(page([]));
    render(<ReportsTab />);

    expect(
      await screen.findByText("No reports match these filters."),
    ).toBeInTheDocument();
  });
});
