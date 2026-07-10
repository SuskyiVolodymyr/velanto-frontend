# Notifications Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A polling bell/drawer in the header showing recent notifications with mark-all-read, plus per-type on/off toggles in Settings — consuming the already-shipped backend API (velanto-backend#59, PR #68).

**Architecture:** New `notificationsClient` (thin fetch wrapper, matches `packsClient`'s shape), a message-formatting helper (`notification-display.ts`), a self-contained `NotificationsBell` component (owns its own open/poll state, mirrors `UserMenu.tsx`'s outside-click/Escape pattern) wired into `AppHeader.tsx`, and a `NotificationsSection` added to the existing `SettingsScreen.tsx`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, Vitest + RTL.

---

### Task 1: Types, API client, relative-time helper

**Files:**

- Create: `src/shared/types/notification.ts`
- Create: `src/shared/lib/notifications-client.ts`
- Create: `src/shared/lib/relative-time.ts`
- Test: `src/shared/lib/notifications-client.test.ts`
- Test: `src/shared/lib/relative-time.test.ts`

- [ ] **Step 1: Write the types**

```ts
// src/shared/types/notification.ts
export const NOTIFICATION_TYPES = [
  "new_follower",
  "new_pack_from_followed",
  "new_comment",
  "pack_deleted_warning",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  type: NotificationType;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
}

export type NotificationPreferences = Record<NotificationType, boolean>;
```

- [ ] **Step 2: Write the failing tests for the API client**

```ts
// src/shared/lib/notifications-client.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notificationsClient } from "./notifications-client";
import { apiClient } from "./api-client";

vi.mock("./api-client");
const mockedApiClient = vi.mocked(apiClient);

describe("notificationsClient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("list() calls GET /notifications with no query when filters are empty", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    await notificationsClient.list();
    expect(mockedApiClient.get).toHaveBeenCalledWith("/notifications");
  });

  it("list() serializes page/limit into the query string", async () => {
    mockedApiClient.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 5,
    });
    await notificationsClient.list({ page: 2, limit: 5 });
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/notifications?page=2&limit=5",
    );
  });

  it("unreadCount() calls GET /notifications/unread-count", async () => {
    mockedApiClient.get.mockResolvedValue({ count: 3 });
    await notificationsClient.unreadCount();
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/notifications/unread-count",
    );
  });

  it("markRead() calls POST /notifications/:id/read", async () => {
    mockedApiClient.post.mockResolvedValue({});
    await notificationsClient.markRead("n1");
    expect(mockedApiClient.post).toHaveBeenCalledWith("/notifications/n1/read");
  });

  it("markAllRead() calls POST /notifications/read-all", async () => {
    mockedApiClient.post.mockResolvedValue({ updated: 2 });
    await notificationsClient.markAllRead();
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/notifications/read-all",
    );
  });

  it("getPreferences() calls GET /notifications/preferences", async () => {
    mockedApiClient.get.mockResolvedValue({});
    await notificationsClient.getPreferences();
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/notifications/preferences",
    );
  });

  it("setPreferences() calls PATCH /notifications/preferences with the given updates", async () => {
    mockedApiClient.patch.mockResolvedValue({});
    await notificationsClient.setPreferences({ new_comment: false });
    expect(mockedApiClient.patch).toHaveBeenCalledWith(
      "/notifications/preferences",
      {
        new_comment: false,
      },
    );
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- notifications-client` — expect FAIL (module not found).

- [ ] **Step 4: Implement the client**

```ts
// src/shared/lib/notifications-client.ts
import { apiClient } from "@/src/shared/lib/api-client";
import type {
  Notification,
  NotificationList,
  NotificationPreferences,
} from "@/src/shared/types/notification";

function buildListQuery(filters: { page?: number; limit?: number }): string {
  const params = new URLSearchParams();
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const notificationsClient = {
  list: (filters: { page?: number; limit?: number } = {}) =>
    apiClient.get<NotificationList>(`/notifications${buildListQuery(filters)}`),
  unreadCount: () =>
    apiClient.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) =>
    apiClient.post<Notification>(`/notifications/${id}/read`),
  markAllRead: () =>
    apiClient.post<{ updated: number }>("/notifications/read-all"),
  getPreferences: () =>
    apiClient.get<NotificationPreferences>("/notifications/preferences"),
  setPreferences: (updates: Partial<NotificationPreferences>) =>
    apiClient.patch<NotificationPreferences>(
      "/notifications/preferences",
      updates,
    ),
};
```

- [ ] **Step 5: Write the failing tests for relative-time**

```ts
// src/shared/lib/relative-time.test.ts
import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./relative-time";

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");

  it("returns 'just now' for under a minute", () => {
    expect(formatRelativeTime("2026-07-08T11:59:30.000Z", now)).toBe(
      "just now",
    );
  });

  it("returns minutes for under an hour", () => {
    expect(formatRelativeTime("2026-07-08T11:45:00.000Z", now)).toBe("15m ago");
  });

  it("returns hours for under a day", () => {
    expect(formatRelativeTime("2026-07-08T09:00:00.000Z", now)).toBe("3h ago");
  });

  it("returns days for a day or more", () => {
    expect(formatRelativeTime("2026-07-06T12:00:00.000Z", now)).toBe("2d ago");
  });
});
```

- [ ] **Step 6: Run to verify it fails, then implement**

```ts
// src/shared/lib/relative-time.ts
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  if (diffMs < MINUTE_MS) return "just now";
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  return `${Math.floor(diffMs / DAY_MS)}d ago`;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- notifications-client relative-time` — expect PASS (all cases).
Run: `npm run typecheck` — expect clean.

- [ ] **Step 8: Commit**

```bash
git add src/shared/types/notification.ts src/shared/lib/notifications-client.ts src/shared/lib/relative-time.ts src/shared/lib/notifications-client.test.ts src/shared/lib/relative-time.test.ts
git commit -m "feat: add notifications types, API client, and relative-time helper"
```

---

### Task 2: Notification message formatting

**Files:**

- Create: `src/shared/lib/notification-display.ts`
- Test: `src/shared/lib/notification-display.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/shared/lib/notification-display.test.ts
import { describe, it, expect } from "vitest";
import { describeNotification } from "./notification-display";
import type { Notification } from "@/src/shared/types/notification";

function makeNotification(overrides: Partial<Notification>): Notification {
  return {
    id: "n1",
    type: "new_follower",
    payload: {},
    readAt: null,
    createdAt: "2026-07-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("describeNotification", () => {
  it("formats new_follower with a link to the follower's profile", () => {
    const result = describeNotification(
      makeNotification({
        type: "new_follower",
        payload: { followerId: "u1", followerUsername: "alice" },
      }),
    );
    expect(result).toEqual({
      message: "alice started following you",
      href: "/users/u1",
    });
  });

  it("formats new_pack_from_followed with a link to the pack", () => {
    const result = describeNotification(
      makeNotification({
        type: "new_pack_from_followed",
        payload: {
          packId: "p1",
          packTitle: "Anime OSTs",
          authorUsername: "bob",
        },
      }),
    );
    expect(result).toEqual({
      message: "bob published a new pack: Anime OSTs",
      href: "/packs/p1",
    });
  });

  it("formats new_comment with a link to the pack", () => {
    const result = describeNotification(
      makeNotification({
        type: "new_comment",
        payload: {
          packId: "p1",
          packTitle: "Anime OSTs",
          commentId: "c1",
          commenterUsername: "carol",
        },
      }),
    );
    expect(result).toEqual({
      message: "carol commented on your pack Anime OSTs",
      href: "/packs/p1",
    });
  });

  it("formats pack_deleted_warning with no link", () => {
    const result = describeNotification(
      makeNotification({
        type: "pack_deleted_warning",
        payload: { packTitle: "Old Pack" },
      }),
    );
    expect(result).toEqual({
      message: 'Your pack "Old Pack" was removed by a moderator',
      href: null,
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- notification-display` — expect FAIL.

- [ ] **Step 3: Implement**

```ts
// src/shared/lib/notification-display.ts
import type { Notification } from "@/src/shared/types/notification";

export interface NotificationDisplay {
  message: string;
  href: string | null;
}

interface NewFollowerPayload {
  followerId: string;
  followerUsername: string;
}
interface NewPackFromFollowedPayload {
  packId: string;
  packTitle: string;
  authorUsername: string;
}
interface NewCommentPayload {
  packId: string;
  packTitle: string;
  commenterUsername: string;
}
interface PackDeletedWarningPayload {
  packTitle: string;
}

export function describeNotification(
  notification: Notification,
): NotificationDisplay {
  switch (notification.type) {
    case "new_follower": {
      const payload = notification.payload as NewFollowerPayload;
      return {
        message: `${payload.followerUsername} started following you`,
        href: `/users/${payload.followerId}`,
      };
    }
    case "new_pack_from_followed": {
      const payload = notification.payload as NewPackFromFollowedPayload;
      return {
        message: `${payload.authorUsername} published a new pack: ${payload.packTitle}`,
        href: `/packs/${payload.packId}`,
      };
    }
    case "new_comment": {
      const payload = notification.payload as NewCommentPayload;
      return {
        message: `${payload.commenterUsername} commented on your pack ${payload.packTitle}`,
        href: `/packs/${payload.packId}`,
      };
    }
    case "pack_deleted_warning": {
      const payload = notification.payload as PackDeletedWarningPayload;
      return {
        message: `Your pack "${payload.packTitle}" was removed by a moderator`,
        href: null,
      };
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- notification-display` — expect PASS (all 4 cases).
Run: `npm run typecheck` — expect clean.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/notification-display.ts src/shared/lib/notification-display.test.ts
git commit -m "feat: add per-type notification message formatting"
```

---

### Task 3: NotificationsBell component (bell + drawer + polling)

**Files:**

- Create: `src/shared/components/NotificationsBell.tsx`
- Test: `src/shared/components/NotificationsBell.test.tsx`

Context: read `src/shared/components/UserMenu.tsx` first (already shown in this plan's design spec) for the exact outside-click/Escape-close idiom (`containerRef`/`triggerRef`, `mousedown`/`keydown` listeners) — reuse it verbatim, don't reinvent. This component renders nothing when `useAuth()`'s `status !== "authenticated"`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/shared/components/NotificationsBell.test.tsx
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationsBell } from "./NotificationsBell";
import { notificationsClient } from "@/src/shared/lib/notifications-client";
import { useAuth } from "@/src/shared/lib/auth-context";

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

  it("loads more results and appends without duplicates", async () => {
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- NotificationsBell` — expect FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
// src/shared/components/NotificationsBell.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { notificationsClient } from "@/src/shared/lib/notifications-client";
import { describeNotification } from "@/src/shared/lib/notification-display";
import { formatRelativeTime } from "@/src/shared/lib/relative-time";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import type { Notification } from "@/src/shared/types/notification";

const POLL_INTERVAL_MS = 30_000;
const PAGE_SIZE = 20;

export function NotificationsBell() {
  const { status } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listStatus, setListStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const authenticated = status === "authenticated";

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    function poll() {
      notificationsClient
        .unreadCount()
        .then((result) => {
          if (!cancelled) setUnreadCount(result.count);
        })
        .catch(() => {
          // Polling failure is silent — the dot just doesn't update this tick.
        });
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    window.addEventListener("focus", poll);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", poll);
    };
  }, [authenticated]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setListStatus("loading");
    notificationsClient
      .list({ page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setNotifications(result.items);
        setTotal(result.total);
        setPage(1);
        setListStatus("ready");
        // Fire after the list renders once, so this open still shows each
        // row's real readAt state before the dot clears.
        void notificationsClient.markAllRead().then(() => {
          if (!cancelled) setUnreadCount(0);
        });
      })
      .catch(() => {
        if (!cancelled) setListStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await notificationsClient.list({
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        return [...prev, ...result.items.filter((n) => !existingIds.has(n.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  if (!authenticated) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-[11px] border border-border bg-surface transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          className="h-4 w-4 rounded-t-full border-[1.6px] border-b-0 border-foreground-secondary"
          aria-hidden
        />
        {unreadCount > 0 && (
          <span
            data-testid="unread-dot"
            className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-background bg-acc"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-10 flex max-h-[70vh] w-[360px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <div className="border-b border-border px-4 py-3">
            <Text className="font-semibold">Notifications</Text>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {listStatus === "loading" && (
              <Text variant="secondary" className="px-2 py-4 text-sm">
                Loading…
              </Text>
            )}
            {listStatus === "error" && (
              <Text className="px-2 py-4 text-sm text-[#ff6b6b]">
                Couldn&apos;t load notifications.
              </Text>
            )}
            {listStatus === "ready" && notifications.length === 0 && (
              <Text variant="secondary" className="px-2 py-4 text-sm">
                No notifications yet.
              </Text>
            )}
            {listStatus === "ready" && notifications.length > 0 && (
              <ul className="flex flex-col gap-1">
                {notifications.map((notification) => {
                  const { message, href } = describeNotification(notification);
                  const row = (
                    <div className="flex flex-col gap-0.5 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
                      <Text className="text-sm">{message}</Text>
                      <Text variant="tertiary" className="text-xs">
                        {formatRelativeTime(notification.createdAt)}
                      </Text>
                    </div>
                  );
                  return (
                    <li key={notification.id}>
                      {href ? (
                        <Link href={href} onClick={() => setOpen(false)}>
                          {row}
                        </Link>
                      ) : (
                        row
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {listStatus === "ready" && notifications.length < total && (
              <Button
                variant="secondary"
                disabled={loadingMore}
                onClick={() => void handleLoadMore()}
                className="mt-2 w-full"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- NotificationsBell` — expect PASS (all cases).
Run: `npm run typecheck` — expect clean.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/NotificationsBell.tsx src/shared/components/NotificationsBell.test.tsx
git commit -m "feat: add NotificationsBell (poll, drawer, mark-all-read, pagination)"
```

---

### Task 4: Wire NotificationsBell into AppHeader

**Files:**

- Modify: `src/shared/components/AppHeader.tsx`
- Modify: `src/shared/components/AppHeader.test.tsx`

- [ ] **Step 1: Write the failing test**

Read `AppHeader.test.tsx` first to match its existing mocking conventions (it already mocks `useAuth` and `UserMenu`-adjacent behavior). Add:

```tsx
it("renders the notifications bell only when authenticated", () => {
  // mock useAuth to authenticated, render AppHeader, assert getByRole("button", { name: /notifications/i }) is present
  // mock useAuth to unauthenticated, render AppHeader, assert queryByRole(...) is null
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- AppHeader` — the new case should FAIL (bell not rendered at all yet).

- [ ] **Step 3: Wire it in**

```tsx
// AppHeader.tsx — add the import and render it next to UserMenu
import { NotificationsBell } from "@/src/shared/components/NotificationsBell";

// inside the authenticated branch:
{
  status === "authenticated" && user && (
    <div className="flex items-center gap-3">
      <NotificationsBell />
      <UserMenu user={user} onLogout={() => void logout()} />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AppHeader` — expect PASS (existing + new cases).
Run: `npm run typecheck` — expect clean.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/AppHeader.tsx src/shared/components/AppHeader.test.tsx
git commit -m "feat: render NotificationsBell in the app header"
```

---

### Task 5: Settings preferences section

**Files:**

- Create: `src/features/settings/NotificationsSection.tsx`
- Modify: `src/features/settings/SettingsScreen.tsx`
- Test: `src/features/settings/NotificationsSection.test.tsx`

Context: read `AppearanceSection.tsx` and `AccountSection.tsx` first (both already shown in this plan's design spec) for the `<section>`/`<Card>` structure this must match.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/settings/NotificationsSection.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationsSection } from "./NotificationsSection";
import { notificationsClient } from "@/src/shared/lib/notifications-client";

vi.mock("@/src/shared/lib/notifications-client");
const mockedClient = vi.mocked(notificationsClient);

const ALL_ON = {
  new_follower: true,
  new_pack_from_followed: true,
  new_comment: true,
  pack_deleted_warning: true,
};

describe("NotificationsSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedClient.getPreferences.mockResolvedValue(ALL_ON);
  });

  it("renders all four toggles in their fetched state", async () => {
    render(<NotificationsSection />);
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "New follower" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("switch", { name: "New pack from someone you follow" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "New comment on your pack" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Pack removed by a moderator" }),
    ).toBeInTheDocument();
  });

  it("toggling one calls setPreferences with only that key", async () => {
    mockedClient.setPreferences.mockResolvedValue({
      ...ALL_ON,
      new_comment: false,
    });
    render(<NotificationsSection />);
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "New comment on your pack" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole("switch", { name: "New comment on your pack" }),
    );
    expect(mockedClient.setPreferences).toHaveBeenCalledWith({
      new_comment: false,
    });
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "New comment on your pack" }),
      ).toHaveAttribute("aria-checked", "false"),
    );
  });

  it("a failed toggle reverts to the prior state, shows a per-row error, and does not affect other toggles", async () => {
    mockedClient.setPreferences.mockRejectedValue(new Error("network"));
    render(<NotificationsSection />);
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "New comment on your pack" }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole("switch", { name: "New comment on your pack" }),
    );
    await waitFor(() =>
      expect(screen.getByText(/couldn't update/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("switch", { name: "New comment on your pack" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("switch", { name: "New follower" }),
    ).toHaveAttribute("aria-checked", "true");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- NotificationsSection` — expect FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
// src/features/settings/NotificationsSection.tsx
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { notificationsClient } from "@/src/shared/lib/notifications-client";
import {
  NOTIFICATION_TYPES,
  type NotificationPreferences,
  type NotificationType,
} from "@/src/shared/types/notification";

const LABELS: Record<NotificationType, string> = {
  new_follower: "New follower",
  new_pack_from_followed: "New pack from someone you follow",
  new_comment: "New comment on your pack",
  pack_deleted_warning: "Pack removed by a moderator",
};

export function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    notificationsClient.getPreferences().then((result) => {
      if (!cancelled) setPrefs(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle(type: NotificationType) {
    if (!prefs) return;
    const nextValue = !prefs[type];
    setBusy((prev) => ({ ...prev, [type]: true }));
    setErrors((prev) => ({ ...prev, [type]: "" }));
    try {
      const updated = await notificationsClient.setPreferences({
        [type]: nextValue,
      });
      setPrefs(updated);
    } catch {
      setErrors((prev) => ({
        ...prev,
        [type]: "Couldn't update this setting. Try again.",
      }));
    } finally {
      setBusy((prev) => ({ ...prev, [type]: false }));
    }
  }

  if (!prefs) return null;

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        Notifications
      </Text>
      <div className="flex flex-col gap-2">
        {NOTIFICATION_TYPES.map((type) => (
          <Card
            key={type}
            className="flex flex-col gap-1 hover:translate-y-0 hover:shadow-none"
          >
            <div className="flex items-center justify-between gap-4">
              <Text className="font-semibold">{LABELS[type]}</Text>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[type]}
                aria-label={LABELS[type]}
                disabled={busy[type]}
                onClick={() => void handleToggle(type)}
                className={cn(
                  "h-6 w-11 shrink-0 rounded-full border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  prefs[type]
                    ? "border-acc bg-acc/30"
                    : "border-border bg-white/5",
                )}
              >
                <span
                  className={cn(
                    "block h-4 w-4 rounded-full bg-foreground transition-transform",
                    prefs[type] ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
            {errors[type] && (
              <Text className="text-xs text-[#ff6b6b]">{errors[type]}</Text>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
```

Update `SettingsScreen.tsx`:

```tsx
import { NotificationsSection } from "@/src/features/settings/NotificationsSection";
// ...
<AppearanceSection />
<NotificationsSection />
<AccountSection />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- NotificationsSection` — expect PASS (all 3 cases).
Run: `npm run typecheck` — expect clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/NotificationsSection.tsx src/features/settings/NotificationsSection.test.tsx src/features/settings/SettingsScreen.tsx
git commit -m "feat: add per-type notification preference toggles to Settings"
```

---

### Task 6: Verify + whole-branch review + PR + merge

- [ ] **Step 1: Run the full verify sequence**

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

All must pass clean.

- [ ] **Step 2: Dispatch `pr-review-toolkit:code-reviewer` for the whole branch diff against `develop`**

Fix any real findings, re-run Step 1 after each fix.

- [ ] **Step 3: Manual browser verification (Claude Preview, against the live backend)**

Trigger each of the four events for real (follow a user, get a pack approved as a moderator, comment on someone else's pack, have a moderator delete a pack) and confirm the bell/drawer/preferences all reflect them.

- [ ] **Step 4: Push, open PR against `develop`**

```bash
git push -u origin feature/notifications-frontend
```

Open the PR referencing `Closes frontend#45`. Merge once green and reviewed (per this repo's standing workflow).

- [ ] **Step 5: Manually close frontend#45 if not auto-closed**

(This repo merges to `develop`, not `main` — check whether this repo's issues auto-close on `develop` merges or need a manual close, matching whatever convention was established for prior frontend PRs.)
