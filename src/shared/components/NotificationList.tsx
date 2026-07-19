"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Spinner } from "@/src/shared/components/Spinner";
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
    <div className="flex items-center gap-2.5 px-2.5 pb-[7px] pt-3.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground-tertiary">
      {children}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
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

/** The body of the notifications panel: a scrollable region with loading/error/
 * empty states and the list (grouped into unread "New" and already-read
 * "Earlier"), plus a footer "Load older" control. The panel header (bell + count
 * + mark-all-read) is rendered separately by the parent. */
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
  const canLoadMore = listReady && notifications.length < total;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-1.5">
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
          <div className="flex flex-col items-center gap-2 px-2 py-12 text-center">
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
      </div>

      {canLoadMore && (
        <div className="flex flex-col gap-1 border-t border-border p-3">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void onLoadMore()}
            className="w-full rounded-[10px] border border-border bg-white/[0.06] p-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-acc/30 hover:bg-acc/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
          >
            {loadingMore ? t("loading") : tn("loadOlder")}
          </button>
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
