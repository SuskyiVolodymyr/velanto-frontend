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
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
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
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListStatus("loading");
    setLoadMoreError("");
    notificationsClient
      .list({ page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setNotifications(result.items);
        setTotal(result.total);
        setPage(1);
        setListStatus("ready");
        // Fired after the list state is set (not before), so the bell's dot
        // clears only once this open's fetch has actually resolved.
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
      const result = await notificationsClient.list({ page: nextPage, limit: PAGE_SIZE });
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        return [...prev, ...result.items.filter((n) => !existingIds.has(n.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
      setLoadMoreError("");
    } catch {
      setLoadMoreError("Couldn't load more notifications. Try again.");
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
              <Text className="px-2 py-4 text-sm text-[#ff6b6b]">Couldn&apos;t load notifications.</Text>
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
              <div className="mt-2 flex flex-col gap-1">
                <Button
                  variant="secondary"
                  disabled={loadingMore}
                  onClick={() => void handleLoadMore()}
                  className="w-full"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
                {loadMoreError && (
                  <Text className="text-xs text-[#ff6b6b]">{loadMoreError}</Text>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
