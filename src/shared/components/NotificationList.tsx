"use client";

import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { NotificationItem } from "@/src/shared/components/NotificationItem";
import type { Notification } from "@/src/shared/types/notification";

interface NotificationListProps {
  notifications: Notification[];
  total: number;
  loading: boolean;
  error: Error | null;
  listReady: boolean;
  loadingMore: boolean;
  loadMoreError: string;
  onLoadMore: () => void;
  /** Closes the drawer when a notification link is followed. */
  onNavigate: () => void;
}

/** The scrollable body of the notifications drawer: loading/error/empty states,
 * the list itself, and the paginated load-more control. */
export function NotificationList({
  notifications,
  total,
  loading,
  error,
  listReady,
  loadingMore,
  loadMoreError,
  onLoadMore,
  onNavigate,
}: NotificationListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-2">
      {loading && (
        <Text variant="secondary" className="px-2 py-4 text-sm">
          Loading…
        </Text>
      )}
      {error && (
        <Text className="px-2 py-4 text-sm text-[#ff6b6b]">Couldn&apos;t load notifications.</Text>
      )}
      {listReady && notifications.length === 0 && (
        <Text variant="secondary" className="px-2 py-4 text-sm">
          No notifications yet.
        </Text>
      )}
      {listReady && notifications.length > 0 && (
        <ul className="flex flex-col gap-1">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationItem notification={notification} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
      {listReady && notifications.length < total && (
        <div className="mt-2 flex flex-col gap-1">
          <Button
            variant="secondary"
            disabled={loadingMore}
            onClick={() => void onLoadMore()}
            className="w-full"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
          {loadMoreError && <Text className="text-xs text-[#ff6b6b]">{loadMoreError}</Text>}
        </div>
      )}
    </div>
  );
}
