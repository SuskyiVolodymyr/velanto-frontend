"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { notificationsClient } from "@/src/shared/lib/notifications-client";

const POLL_INTERVAL_MS = 30_000;
const PAGE_SIZE = 20;

/**
 * Drives {@link NotificationsBell}: the polled unread count, the open/close
 * lifecycle (outside-click + Escape), the drawer's paged list (fetched only
 * while open), and the mark-all-read that clears the dot once the list loads.
 */
export function useNotifications() {
  const { status } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
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

  // The drawer's list is fetched only while it's open (enabled: open) and its
  // in-flight request is aborted if the drawer closes first. `page` is stored
  // in the fetched data so it resets on each reopen.
  const listQuery = useClientData(
    async () => {
      const result = await notificationsClient.list({
        page: 1,
        limit: PAGE_SIZE,
      });
      return { items: result.items, total: result.total, page: 1 };
    },
    [],
    { enabled: open },
  );

  const notifications = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const listLoaded = listQuery.data !== null;
  const listReady =
    listLoaded && !listQuery.loading && listQuery.error === null;

  // Once the open drawer's list has loaded, mark everything read and clear the
  // bell's dot. markAllRead's setState lives in its async .then, so this is not
  // the flagged synchronous set-state-in-effect pattern.
  useEffect(() => {
    if (!open || !listLoaded) return;
    let cancelled = false;
    void notificationsClient
      .markAllRead()
      .then(() => {
        if (!cancelled) setUnreadCount(0);
      })
      .catch(() => {
        // Silent, matching the poll's own catch — a failed mark-all-read just
        // means the dot clears on a later successful poll instead.
      });
    return () => {
      cancelled = true;
    };
  }, [open, listLoaded]);

  async function handleLoadMore() {
    const current = listQuery.data;
    if (!current) return;
    setLoadingMore(true);
    try {
      const nextPage = current.page + 1;
      const result = await notificationsClient.list({
        page: nextPage,
        limit: PAGE_SIZE,
      });
      listQuery.setData((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.items.map((n) => n.id));
        return {
          items: [
            ...prev.items,
            ...result.items.filter((n) => !existingIds.has(n.id)),
          ],
          total: result.total,
          page: nextPage,
        };
      });
      setLoadMoreError("");
    } catch {
      setLoadMoreError("Couldn't load more notifications. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    authenticated,
    unreadCount,
    open,
    setOpen,
    containerRef,
    triggerRef,
    notifications,
    total,
    listLoading: listQuery.loading,
    listError: listQuery.error,
    listReady,
    loadingMore,
    loadMoreError,
    handleLoadMore,
  };
}
