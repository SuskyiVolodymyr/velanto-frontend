"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { describeNotification } from "@/src/shared/lib/notification-display";
import { formatRelativeTime } from "@/src/shared/lib/relative-time";
import { cn } from "@/src/shared/lib/cn";
import { Text } from "@/src/shared/components/Text";
import {
  avatarGradient,
  avatarInitial,
  notificationVisual,
} from "@/src/shared/components/notification-visual";
import type { Notification } from "@/src/shared/types/notification";

interface NotificationItemProps {
  notification: Notification;
  /** Closes the drawer when a linked notification is followed. */
  onNavigate: () => void;
}

/**
 * A single notification row: a per-type coloured icon (or the actor's avatar
 * with the icon as a badge), the formatted message, its relative time, and an
 * unread stripe + dot until it's read. Wrapped in a Link when the notification
 * points somewhere. The type→icon/tone mapping lives in notification-visual.
 */
export function NotificationItem({
  notification,
  onNavigate,
}: NotificationItemProps) {
  const t = useTranslations("notifications");
  const { messageKey, values, href } = describeNotification(notification);
  const message = t(messageKey, values);
  const { tone, Icon, actor } = notificationVisual(notification.type);
  const unread = notification.readAt === null;
  const actorName = values.username;
  const showAvatar = actor && !!actorName;

  const row = (
    <div
      data-testid="notification-row"
      data-type={notification.type}
      className={cn(
        "relative grid grid-cols-[44px_1fr_auto] items-start gap-3 rounded-xl py-2.5 pl-4 pr-3 transition-colors",
        !unread && "hover:bg-white/[0.04]",
      )}
      style={unread ? { backgroundColor: `${tone}14` } : undefined}
    >
      {unread && (
        <span
          aria-hidden
          className="absolute bottom-3 left-1 top-3 w-[3px] rounded-full"
          style={{ backgroundColor: tone }}
        />
      )}

      <span className="relative h-11 w-11">
        {showAvatar ? (
          <span
            data-testid="notification-avatar"
            aria-hidden
            className="grid h-11 w-11 place-items-center rounded-full text-base font-semibold text-[#0a0b0e]"
            style={{ background: avatarGradient(actorName) }}
          >
            {avatarInitial(actorName)}
          </span>
        ) : (
          <span
            data-testid="notification-icon"
            className="grid h-11 w-11 place-items-center rounded-[13px]"
            style={{
              color: tone,
              backgroundColor: `${tone}24`,
              border: `1px solid ${tone}4d`,
            }}
          >
            <Icon aria-hidden className="h-5 w-5" strokeWidth={2} />
          </span>
        )}
        {showAvatar && (
          <span
            aria-hidden
            className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-[2.5px] border-surface text-[#0a0b0e]"
            style={{ backgroundColor: tone }}
          >
            <Icon className="h-3 w-3" strokeWidth={2.4} />
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
        <Text className="text-[13.5px] leading-snug">{message}</Text>
        <Text variant="tertiary" className="text-[11.5px]">
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </span>

      {unread && (
        <span
          data-testid="notification-unread"
          aria-hidden
          className="mt-1 h-2 w-2 self-center rounded-full"
          style={{ backgroundColor: tone }}
        />
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
      >
        {row}
      </Link>
    );
  }
  return row;
}
