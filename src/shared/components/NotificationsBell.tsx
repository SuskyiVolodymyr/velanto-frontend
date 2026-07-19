"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/src/shared/components/use-notifications";
import { NotificationList } from "@/src/shared/components/NotificationList";
import { NotificationsPanelHeader } from "@/src/shared/components/NotificationsPanelHeader";

export function NotificationsBell() {
  const {
    authenticated,
    unreadCount,
    newCount,
    markAllRead,
    open,
    setOpen,
    containerRef,
    triggerRef,
    notifications,
    total,
    listLoading,
    listError,
    listReady,
    loadingMore,
    loadMoreError,
    handleLoadMore,
  } = useNotifications();
  const t = useTranslations("notifications");

  if (!authenticated) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("title")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[11px] border border-border bg-surface transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Bell
          className="h-[18px] w-[18px] text-foreground-secondary"
          strokeWidth={1.8}
          aria-hidden
        />
        {unreadCount > 0 && (
          <span
            data-testid="unread-dot"
            className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-background bg-acc"
          />
        )}
      </button>

      {open && (
        <>
          {/* Dimmed backdrop, matching Vilante Home.dc.html's NOTIFICATIONS
              DRAWER mock — click closes, same as the outside-click handler
              above but visible so the drawer reads as modal-like. */}
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9] bg-black/40"
          />
          <div
            role="dialog"
            aria-label={t("title")}
            className="absolute right-0 top-12 z-10 flex max-h-[70vh] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          >
            <NotificationsPanelHeader
              newCount={newCount}
              onMarkAllRead={markAllRead}
            />
            <NotificationList
              notifications={notifications}
              total={total}
              loading={listLoading}
              error={listError}
              listReady={listReady}
              loadingMore={loadingMore}
              loadMoreError={loadMoreError}
              onLoadMore={handleLoadMore}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
