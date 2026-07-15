"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { describeNotification } from "@/src/shared/lib/notification-display";
import { formatRelativeTime } from "@/src/shared/lib/relative-time";
import { Text } from "@/src/shared/components/Text";
import type { Notification } from "@/src/shared/types/notification";

interface NotificationItemProps {
  notification: Notification;
  /** Closes the drawer when a linked notification is followed. */
  onNavigate: () => void;
}

/** A single notification row: its formatted message, relative time, and an
 * optional Link wrapper when the notification points somewhere. */
export function NotificationItem({
  notification,
  onNavigate,
}: NotificationItemProps) {
  const t = useTranslations("notifications");
  const { messageKey, values, href } = describeNotification(notification);
  const message = t(messageKey, values);
  const row = (
    <div className="flex flex-col gap-0.5 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
      <Text className="text-sm">{message}</Text>
      <Text variant="tertiary" className="text-xs">
        {formatRelativeTime(notification.createdAt)}
      </Text>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onNavigate}>
        {row}
      </Link>
    );
  }
  return row;
}
