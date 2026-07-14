// src/features/admin/LogsTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { renderWithQueryClient as render } from "@/src/shared/test/render-with-query-client";
import userEvent from "@testing-library/user-event";
import { LogsTab } from "./LogsTab";
import { adminClient } from "@/src/shared/lib/admin-client";
import type { AuditLogEntry } from "@/src/shared/types/admin";

vi.mock("@/src/shared/lib/admin-client", () => ({
  adminClient: { auditLogs: vi.fn() },
}));

const LOG: AuditLogEntry = {
  id: "l1",
  actorId: "a1",
  actorUsername: "admin1",
  action: "ban_user",
  target: "u2",
  meta: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

/** The request the tab makes with nothing filtered. */
const BASE_REQUEST = {
  q: undefined,
  action: undefined,
  from: undefined,
  to: undefined,
  sort: "newest",
  page: 1,
  limit: 20,
};

function mockLogs(items: AuditLogEntry[], total = items.length) {
  vi.mocked(adminClient.auditLogs).mockResolvedValue({
    items,
    total,
    page: 1,
    limit: 20,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LogsTab", () => {
  it("fetches page 1 with no filters and renders log rows", async () => {
    mockLogs([LOG]);
    render(<LogsTab />);

    expect(await screen.findByText(/admin1/)).toBeInTheDocument();
    // The raw action code renders through its human label. Scoped to the table —
    // "Ban user" is also an option in the action filter dropdown.
    const table = screen.getByRole("table");
    expect(within(table).getByText("Ban user")).toBeInTheDocument();
    expect(adminClient.auditLogs).toHaveBeenCalledWith(BASE_REQUEST);
  });

  it("re-fetches with an action filter", async () => {
    mockLogs([]);
    const user = userEvent.setup();
    render(<LogsTab />);
    await screen.findByText("No log entries match these filters.");

    await user.selectOptions(
      screen.getByLabelText("Filter by action"),
      "ban_user",
    );

    await waitFor(() =>
      expect(adminClient.auditLogs).toHaveBeenLastCalledWith({
        ...BASE_REQUEST,
        action: "ban_user",
      }),
    );
  });

  it("re-fetches with a from/to date range", async () => {
    mockLogs([]);
    const user = userEvent.setup();
    render(<LogsTab />);
    await screen.findByText("No log entries match these filters.");

    await user.type(screen.getByLabelText("From date"), "2026-07-01");
    await user.type(screen.getByLabelText("To date"), "2026-07-08");

    await waitFor(() =>
      expect(adminClient.auditLogs).toHaveBeenLastCalledWith({
        ...BASE_REQUEST,
        from: "2026-07-01",
        to: "2026-07-08",
      }),
    );
  });

  it("toggles the sort between newest and oldest", async () => {
    mockLogs([]);
    const user = userEvent.setup();
    render(<LogsTab />);
    await screen.findByText("No log entries match these filters.");

    await user.click(screen.getByRole("button", { name: /Sort: Newest/ }));

    await waitFor(() =>
      expect(adminClient.auditLogs).toHaveBeenLastCalledWith({
        ...BASE_REQUEST,
        sort: "oldest",
      }),
    );
  });

  it("pages forward with Next and back with Prev", async () => {
    // 25 total over a 20-row page → exactly two pages.
    mockLogs([LOG], 25);
    const user = userEvent.setup();
    render(<LogsTab />);
    await screen.findByText(/admin1/);

    // On page 1 there is nowhere back to go.
    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(adminClient.auditLogs).toHaveBeenLastCalledWith({
        ...BASE_REQUEST,
        page: 2,
      }),
    );

    // Going back doesn't refetch — page 1 is already in the React Query cache —
    // so assert the resulting state rather than another request.
    await user.click(screen.getByRole("button", { name: "Prev" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled(),
    );
    expect(screen.getByText(/Showing 1–20 of 25/)).toBeInTheDocument();
  });

  // Otherwise a page number from the previous, wider result set could point past
  // the end of the newly filtered one.
  it("returns to page 1 when a filter changes", async () => {
    mockLogs([LOG], 25);
    const user = userEvent.setup();
    render(<LogsTab />);
    await screen.findByText(/admin1/);

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(adminClient.auditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );

    await user.selectOptions(
      screen.getByLabelText("Filter by action"),
      "ban_user",
    );

    await waitFor(() =>
      expect(adminClient.auditLogs).toHaveBeenLastCalledWith({
        ...BASE_REQUEST,
        action: "ban_user",
        page: 1,
      }),
    );
  });

  // Actions are colour-coded by what they do, so a log page is scannable at a
  // glance: punitive red, restorative green, privilege violet.
  it("colours each action chip by its kind, and falls back for an unknown code", async () => {
    mockLogs([
      { ...LOG, id: "l1", action: "ban_user" },
      { ...LOG, id: "l2", action: "unban_user" },
      { ...LOG, id: "l3", action: "role_change" },
      { ...LOG, id: "l4", action: "brand_new_action" },
    ]);
    render(<LogsTab />);
    await screen.findByText("brand_new_action");

    const table = screen.getByRole("table");
    const ban = within(table).getByText("Ban user");
    const unban = within(table).getByText("Unban user");
    const role = within(table).getByText("Change role");

    expect(ban.className).toContain("text-danger");
    expect(unban.className).toContain("text-success");
    expect(role.className).toContain("violet");
    // The three kinds must actually differ, not just all be "some colour".
    expect(ban.className).not.toBe(unban.className);
    expect(unban.className).not.toBe(role.className);

    // An action the map has never heard of still renders — as its raw code.
    expect(within(table).getByText("brand_new_action")).toBeInTheDocument();
  });

  it("shows an empty state when no logs match", async () => {
    mockLogs([]);
    render(<LogsTab />);

    expect(
      await screen.findByText("No log entries match these filters."),
    ).toBeInTheDocument();
  });

  it("shows an error state when the fetch rejects", async () => {
    vi.mocked(adminClient.auditLogs).mockRejectedValue(
      new Error("network error"),
    );
    render(<LogsTab />);

    expect(
      await screen.findByText("Couldn't load logs. Try again later."),
    ).toBeInTheDocument();
  });
});
