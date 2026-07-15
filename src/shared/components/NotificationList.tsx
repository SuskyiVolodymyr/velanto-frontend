"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Spinner } from "@/src/shared/components/Spinner";
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
  const t = useTranslations("common");
  const tn = useTranslations("notifications");
  return (
    <div className="flex-1 overflow-y-auto p-2">
      {loading && (
        <div
          role="status"
          className="flex items-center gap-2 px-2 py-4 text-sm text-foreground-secondary"
        >
          <Spinner size={16} />
          <span>{t("loading")}</span>
        </div>
      )}
      {error && (
        <Text className="px-2 py-4 text-sm text-danger">{tn("loadError")}</Text>
      )}
      {listReady && notifications.length === 0 && (
        <Text variant="secondary" className="px-2 py-4 text-sm">
          {tn("empty")}
        </Text>
      )}
      {listReady && notifications.length > 0 && (
        <ul className="flex flex-col gap-1">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationItem
                notification={notification}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      )}
      {listReady && notifications.length < total && (
        <div className="mt-2 flex flex-col gap-1">
          <Button
            variant="secondary"
            loading={loadingMore}
            onClick={() => void onLoadMore()}
            className="w-full"
          >
            {loadingMore ? t("loading") : t("loadMore")}
          </Button>
          {loadMoreError && (
            <Text className="text-xs text-danger">{loadMoreError}</Text>
          )}
        </div>
      )}
    </div>
  );
}
