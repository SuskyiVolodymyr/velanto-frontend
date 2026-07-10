// src/features/admin/LogsTab.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LogsTab", () => {
  it("fetches page 1 with no filters and renders log rows", async () => {
    vi.mocked(adminClient.auditLogs).mockResolvedValue({
      items: [LOG],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<LogsTab />);

    expect(await screen.findByText(/admin1/)).toBeInTheDocument();
    expect(screen.getByText(/ban_user/)).toBeInTheDocument();
    expect(adminClient.auditLogs).toHaveBeenCalledWith({
      actor: undefined,
      action: undefined,
      target: undefined,
      page: 1,
      limit: 20,
    });
  });

  it("re-fetches with an action filter after debounce", async () => {
    // shouldAdvanceTime: true lets real wall-clock time keep advancing fake
    // timers in the background. Without it, @testing-library/user-event's
    // internal wait() (dist/cjs/utils/misc/wait.js) races a real setTimeout
    // against config.advanceTimers — under a plain vi.useFakeTimers(), the
    // real setTimeout side of that race is itself faked and never fires,
    // deadlocking user.type(). Confirmed by isolating user.type() alone
    // (hangs) vs with this option (resolves); the component/debounce logic
    // is unaffected either way — vi.advanceTimersByTime(300) below still
    // deterministically fires the actual filter-debounce timer.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(adminClient.auditLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    const user = userEvent.setup({ delay: null });
    render(<LogsTab />);

    await user.type(screen.getByLabelText("Filter by action"), "ban_user");
    vi.advanceTimersByTime(300);

    await waitFor(() =>
      expect(adminClient.auditLogs).toHaveBeenLastCalledWith({
        actor: undefined,
        action: "ban_user",
        target: undefined,
        page: 1,
        limit: 20,
      }),
    );
    vi.useRealTimers();
  });

  it("shows an empty state when no logs match", async () => {
    vi.mocked(adminClient.auditLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    render(<LogsTab />);
    expect(
      await screen.findByText("No audit log entries match these filters."),
    ).toBeInTheDocument();
  });

  it("shows an error state when the initial fetch rejects", async () => {
    vi.mocked(adminClient.auditLogs).mockRejectedValue(
      new Error("network error"),
    );
    render(<LogsTab />);
    expect(
      await screen.findByText("Couldn't load logs. Try again later."),
    ).toBeInTheDocument();
  });

  it("shows a load-more error and re-enables the button when loading more rejects", async () => {
    vi.mocked(adminClient.auditLogs).mockResolvedValueOnce({
      items: [LOG],
      total: 2,
      page: 1,
      limit: 20,
    });
    const user = userEvent.setup();
    render(<LogsTab />);

    await screen.findByText(/admin1/);
    vi.mocked(adminClient.auditLogs).mockRejectedValueOnce(
      new Error("network error"),
    );
    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(
      await screen.findByText("Couldn't load more logs. Try again."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).not.toBeDisabled();
  });
});
