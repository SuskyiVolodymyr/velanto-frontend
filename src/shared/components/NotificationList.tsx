"use client";

import { Bell } from "lucide-react";
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

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground-tertiary">
      {children}
    </p>
  );
}

function Group({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: Notification[];
  onNavigate: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <GroupLabel>{label}</GroupLabel>
      <ul className="flex flex-col gap-0.5">
        {items.map((notification) => (
          <li key={notification.id}>
            <NotificationItem
              notification={notification}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The scrollable body of the notifications drawer: loading/error/empty states,
 * the list itself (grouped into unread "New" and already-read "Earlier"), and
 * the paginated load-more control. */
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

  const unread = notifications.filter((n) => n.readAt === null);
  const read = notifications.filter((n) => n.readAt !== null);

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
        <Text variant="danger" className="px-2 py-4 text-sm">
          {tn("loadError")}
        </Text>
      )}
      {listReady && notifications.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
          <Bell
            className="h-7 w-7 text-foreground-tertiary"
            strokeWidth={1.6}
            aria-hidden
          />
          <Text variant="secondary" className="text-sm">
            {tn("empty")}
          </Text>
        </div>
      )}
      {listReady && notifications.length > 0 && (
        <div className="flex flex-col gap-1">
          <Group
            label={tn("groupNew")}
            items={unread}
            onNavigate={onNavigate}
          />
          <Group
            label={tn("groupEarlier")}
            items={read}
            onNavigate={onNavigate}
          />
        </div>
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
            <Text variant="danger" className="text-xs">
              {loadMoreError}
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
