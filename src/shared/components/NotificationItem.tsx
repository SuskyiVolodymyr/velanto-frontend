"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { describeNotification } from "@/src/shared/lib/notification-display";
import { formatRelativeTime } from "@/src/shared/lib/relative-time";
import { cn } from "@/src/shared/lib/cn";
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
 * A single notification row, matching the notifications-redesign mock: the
 * actor's avatar (or a system icon tile) with the per-type icon as a badge; a
 * rich message with a bold @handle, muted action text, and the tone-coloured
 * pack/object; an optional quoted snippet (comment / mention body); and a meta
 * line with the type label + relative time. Unread rows get a tinted background,
 * a left accent stripe, and a trailing dot. The type→icon/tone mapping lives in
 * notification-visual; the message wording in the `notifications` catalog.
 */
export function NotificationItem({
  notification,
  onNavigate,
}: NotificationItemProps) {
  const t = useTranslations("notifications");
  const { messageKey, kindKey, values, excerpt, href } =
    describeNotification(notification);
  const { tone, Icon, actor } = notificationVisual(notification.type);
  const unread = notification.readAt === null;
  const actorName = values.username;
  const showAvatar = actor && !!actorName;

  const message = t.rich(messageKey, {
    user: (chunks: ReactNode) => (
      <span className="font-semibold text-foreground">{chunks}</span>
    ),
    muted: (chunks: ReactNode) => (
      <span className="text-foreground-secondary">{chunks}</span>
    ),
    obj: (chunks: ReactNode) => (
      <span className="font-medium" style={{ color: tone }}>
        {chunks}
      </span>
    ),
    username: actorName ?? "",
    packTitle: values.packTitle ?? "",
  });

  const row = (
    <div
      data-testid="notification-row"
      data-type={notification.type}
      className={cn(
        "relative grid grid-cols-[44px_1fr_auto] items-start gap-3 rounded-xl py-3 pl-[14px] pr-3 transition-colors",
        !unread && "hover:bg-white/[0.04]",
      )}
      style={unread ? { backgroundColor: `${tone}12` } : undefined}
    >
      {unread && (
        <span
          aria-hidden
          className="absolute bottom-[14px] left-1 top-[14px] w-[3px] rounded-full"
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
            <Icon aria-hidden className="h-[21px] w-[21px]" strokeWidth={2} />
          </span>
        )}
        {showAvatar && (
          <span
            aria-hidden
            className="absolute -bottom-[3px] -right-[3px] grid h-5 w-5 place-items-center rounded-full border-[2.5px] border-surface text-[#0a0b0e]"
            style={{ backgroundColor: tone }}
          >
            <Icon className="h-[11px] w-[11px]" strokeWidth={2.4} />
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-col gap-[3px] pt-px">
        <span className="text-[13.5px] leading-[1.42] text-foreground">
          {message}
        </span>
        {excerpt && (
          <span className="mt-[5px] rounded-r-lg border-l-2 border-border-strong bg-white/[0.02] px-2.5 py-[7px] text-[12.5px] leading-[1.4] text-foreground-secondary">
            &ldquo;{excerpt}&rdquo;
          </span>
        )}
        <span className="mt-px flex items-center gap-2 text-[11.5px] tabular-nums text-foreground-tertiary">
          <span className="font-semibold" style={{ color: tone }}>
            {t(kindKey)}
          </span>
          <span
            aria-hidden
            className="h-[3px] w-[3px] rounded-full bg-current opacity-60"
          />
          {formatRelativeTime(notification.createdAt)}
        </span>
      </span>

      {unread && (
        <span
          data-testid="notification-unread"
          aria-hidden
          className="mt-1 h-[9px] w-[9px] self-center rounded-full"
          style={{
            backgroundColor: tone,
            boxShadow: `0 0 0 4px ${tone}29`,
          }}
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
