"use client";

import { useEffect, useRef, useState } from "react";
import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { notificationsClient } from "@/src/shared/lib/notifications-client";

const POLL_INTERVAL_MS = 30_000;
const PAGE_SIZE = 20;

const UNREAD_KEY = ["notifications-unread"] as const;

function notificationsListQueryOptions() {
  return infiniteQueryOptions({
    queryKey: ["notifications-list"] as const,
    queryFn: ({ pageParam }) =>
      notificationsClient.list({ page: pageParam, limit: PAGE_SIZE }),
    // Don't refetch the open drawer on window focus: the fetched rows carry the
    // `readAt` they had when opened (drives the New/Earlier split + unread
    // styling), and a focus refetch would return them now-read and collapse
    // everything into "Earlier" mid-view. The unread *count* still polls
    // separately, so a freshly-arrived notification is reflected on reopen.
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (count, page) => count + page.items.length,
        0,
      );
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

/**
 * Drives {@link NotificationsBell}: the polled unread count, the open/close
 * lifecycle (outside-click + Escape), the drawer's paged list (fetched only
 * while open), and the mark-all-read that clears the dot once the list loads.
 *
 * `alwaysOpen` is for the full-page mobile notifications screen, which has no
 * drawer to open: it fetches the list (and marks read) unconditionally, as if
 * the drawer were permanently open.
 */
export function useNotifications({ alwaysOpen = false } = {}) {
  const { status } = useAuth();
  const t = useTranslations("notifications");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const authenticated = status === "authenticated";

  // Polled unread count. React Query's refetchInterval covers the 30s poll;
  // its refetchOnWindowFocus keys off `visibilitychange`, so the explicit
  // focus listener below covers a plain window focus too.
  const unreadQuery = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => notificationsClient.unreadCount(),
    enabled: authenticated,
    refetchInterval: authenticated ? POLL_INTERVAL_MS : false,
  });
  const unreadCount = unreadQuery.data?.count ?? 0;
  const { refetch: refetchUnread } = unreadQuery;

  useEffect(() => {
    if (!authenticated) return;
    const onFocus = () => void refetchUnread();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authenticated, refetchUnread]);

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

  // Fetched while the drawer is open, or always for the full-page consumer.
  const active = open || alwaysOpen;
  const listQuery = useInfiniteQuery({
    ...notificationsListQueryOptions(),
    enabled: authenticated && active,
  });

  const seen = new Set<string>();
  const notifications = (listQuery.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  const total = listQuery.data?.pages.at(-1)?.total ?? 0;
  const listLoaded = listQuery.data !== undefined;
  const listReady = listLoaded && !listQuery.isLoading;

  const markAllRead = useMutation({
    mutationFn: () => notificationsClient.markAllRead(),
    onSuccess: () => queryClient.setQueryData(UNREAD_KEY, { count: 0 }),
  });
  const { mutate: markAllReadMutate } = markAllRead;

  // Once the list has loaded (drawer open, or the full page), mark everything
  // read and clear the bell's dot.
  useEffect(() => {
    if (active && listLoaded) markAllReadMutate();
  }, [active, listLoaded, markAllReadMutate]);

  return {
    authenticated,
    unreadCount,
    open,
    setOpen,
    containerRef,
    triggerRef,
    notifications,
    total,
    listLoading: listQuery.isLoading,
    listError:
      !listLoaded && listQuery.isError ? (listQuery.error as Error) : null,
    listReady,
    loadingMore: listQuery.isFetchingNextPage,
    loadMoreError:
      listLoaded && (listQuery.isError || listQuery.isFetchNextPageError)
        ? t("loadMoreError")
        : "",
    handleLoadMore: () => listQuery.fetchNextPage(),
  };
}
