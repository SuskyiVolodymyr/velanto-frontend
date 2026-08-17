"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The notifications panel header, shared by the bell dropdown and the full-page
 * screen: a cyan bell tile, the title with an unread "N new" pill, and a
 * "Mark all read" control (shown only while something is unread). Matches the
 * notifications-redesign mock.
 */
export function NotificationsPanelHeader({
  newCount,
  onMarkAllRead,
}: {
  newCount: number;
  onMarkAllRead: () => void;
}) {
  const t = useTranslations("notifications");
  return (
    <div className="flex items-center gap-3 border-b border-border bg-white/[0.01] px-4 py-3.5">
      <span
        aria-hidden
        className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border border-acc/25 bg-acc/10 text-acc"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
        {t("title")}
        {newCount > 0 && (
          <span className="rounded-full bg-acc px-[7px] py-1 text-[11px] font-bold leading-none tabular-nums text-[#04222a]">
            {t("newCount", { count: newCount })}
          </span>
        )}
      </h2>
      {newCount > 0 && (
        <button
          type="button"
          onClick={onMarkAllRead}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-[7px] text-[12.5px] font-medium text-foreground-secondary transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
        >
          <CheckCheck
            className="h-[15px] w-[15px]"
            strokeWidth={2}
            aria-hidden
          />
          {t("markAllRead")}
        </button>
      )}
    </div>
  );
}
