// src/shared/components/NotificationsBell.test.tsx
import type { ReactElement, ReactNode } from "react";
import {
  render as rtlRender,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { NotificationsBell } from "./NotificationsBell";
import { notificationsClient } from "@/src/shared/lib/notifications-client";
import { useAuth } from "@/src/shared/lib/auth-context";

// Fresh QueryClient per render so a query key isn't served from a prior test's
// cache.
function render(ui: ReactElement) {
  const client = createTestQueryClient();
  return rtlRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

vi.mock("@/src/shared/lib/notifications-client");
vi.mock("@/src/shared/lib/auth-context");

const mockedClient = vi.mocked(notificationsClient);
const mockedUseAuth = vi.mocked(useAuth);

function mockAuth(status: "authenticated" | "unauthenticated" | "loading") {
  mockedUseAuth.mockReturnValue({
    user:
      status === "authenticated"
        ? {
            id: "u1",
            email: "a@x.com",
            username: "alice",
            role: "user",
            createdAt: "",
          }
        : null,
    status,
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

function makeNotification(overrides = {}) {
  return {
    id: "n1",
    type: "new_follower" as const,
    payload: { followerId: "u2", followerUsername: "bob" },
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("NotificationsBell", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedClient.unreadCount.mockResolvedValue({ count: 0 });
    mockedClient.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    mockedClient.markAllRead.mockResolvedValue({ updated: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when unauthenticated", async () => {
    mockAuth("unauthenticated");
    const { container } = render(<NotificationsBell />);
    await waitFor(() =>
      expect(mockedClient.unreadCount).not.toHaveBeenCalled(),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an unread dot when the polled count is greater than zero", async () => {
    mockAuth("authenticated");
    mockedClient.unreadCount.mockResolvedValue({ count: 2 });
    render(<NotificationsBell />);
    await waitFor(() =>
      expect(screen.getByTestId("unread-dot")).toBeInTheDocument(),
    );
  });

  it("does not show an unread dot when the count is zero", async () => {
    mockAuth("authenticated");
    render(<NotificationsBell />);
    await waitFor(() => expect(mockedClient.unreadCount).toHaveBeenCalled());
    expect(screen.queryByTestId("unread-dot")).not.toBeInTheDocument();
  });

  it("opens the drawer, fetches the list, and marks all read", async () => {
    mockAuth("authenticated");
    mockedClient.list.mockResolvedValue({
      items: [makeNotification()],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<NotificationsBell />);
    await userEvent.click(
      screen.getByRole("button", { name: /notifications/i }),
    );
    await waitFor(() =>
      expect(screen.getByText("bob started following you")).toBeInTheDocument(),
    );
    await waitFor(() => expect(mockedClient.markAllRead).toHaveBeenCalled());
  });

  it("closes on outside click", async () => {
    mockAuth("authenticated");
    render(
      <div>
        <NotificationsBell />
        <button>outside</button>
      </div>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /notifications/i }),
    );
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "outside" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("closes on Escape", async () => {
    mockAuth("authenticated");
    render(<NotificationsBell />);
    await userEvent.click(
      screen.getByRole("button", { name: /notifications/i }),
    );
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("shows the empty state when there are no notifications", async () => {
    mockAuth("authenticated");
    render(<NotificationsBell />);
    await userEvent.click(
      screen.getByRole("button", { name: /notifications/i }),
    );
    await waitFor(() =>
      expect(screen.getByText("No notifications yet.")).toBeInTheDocument(),
    );
  });

  it("shows an error state when the list fetch fails", async () => {
    mockAuth("authenticated");
    mockedClient.list.mockRejectedValue(new Error("network"));
    render(<NotificationsBell />);
    await userEvent.click(
      screen.getByRole("button", { name: /notifications/i }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load notifications/i),
      ).toBeInTheDocument(),
    );
  });

  it("loads more results and appends new items", async () => {
    mockAuth("authenticated");
    mockedClient.list
      .mockResolvedValueOnce({
        items: [makeNotification({ id: "n1" })],
        total: 2,
        page: 1,
        limit: 1,
      })
      .mockResolvedValueOnce({
        items: [
          makeNotification({
            id: "n2",
            payload: { followerId: "u3", followerUsername: "carol" },
          }),
        ],
        total: 2,
        page: 2,
        limit: 1,
      });
    render(<NotificationsBell />);
    await userEvent.click(
      screen.getByRole("button", { name: /notifications/i }),
    );
    await waitFor(() =>
      expect(screen.getByText("bob started following you")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() =>
      expect(
        screen.getByText("carol started following you"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("bob started following you")).toBeInTheDocument();
  });

  it("does not duplicate a row the next page re-returns", async () => {
    mockAuth("authenticated");
    mockedClient.list
      .mockResolvedValueOnce({
        items: [makeNotification({ id: "n1" })],
        total: 2,
        page: 1,
        limit: 1,
      })
      .mockResolvedValueOnce({
        items: [
          makeNotification({ id: "n1" }),
          makeNotification({
            id: "n2",
            payload: { followerId: "u3", followerUsername: "carol" },
          }),
        ],
        total: 2,
        page: 2,
        limit: 1,
      });
    render(<NotificationsBell />);
    await userEvent.click(
      screen.getByRole("button", { name: /notifications/i }),
    );
    await waitFor(() =>
      expect(screen.getByText("bob started following you")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() =>
      expect(
        screen.getByText("carol started following you"),
      ).toBeInTheDocument(),
    );
    expect(screen.getAllByText("bob started following you")).toHaveLength(1);
  });

  it("shows a load-more error and re-enables the button on failure, without losing the loaded rows", async () => {
    mockAuth("authenticated");
    mockedClient.list
      .mockResolvedValueOnce({
        items: [makeNotification({ id: "n1" })],
        total: 2,
        page: 1,
        limit: 1,
      })
      .mockRejectedValueOnce(new Error("network"));
    render(<NotificationsBell />);
    await userEvent.click(
      screen.getByRole("button", { name: /notifications/i }),
    );
    await waitFor(() =>
      expect(screen.getByText("bob started following you")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load more notifications/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("bob started following you")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /load more/i }),
    ).not.toBeDisabled();
  });

  it("polls unread-count again after the interval elapses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockAuth("authenticated");
    render(<NotificationsBell />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedClient.unreadCount).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(mockedClient.unreadCount).toHaveBeenCalledTimes(2);
  });

  it("polls unread-count again on window focus", async () => {
    mockAuth("authenticated");
    render(<NotificationsBell />);
    await waitFor(() =>
      expect(mockedClient.unreadCount).toHaveBeenCalledTimes(1),
    );
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(mockedClient.unreadCount).toHaveBeenCalledTimes(2),
    );
  });
});
