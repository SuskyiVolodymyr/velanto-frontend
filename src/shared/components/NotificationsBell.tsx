"use client";

import { Text } from "@/src/shared/components/Text";
import { useNotifications } from "@/src/shared/components/use-notifications";
import { NotificationList } from "@/src/shared/components/NotificationList";

export function NotificationsBell() {
  const {
    authenticated,
    unreadCount,
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

  if (!authenticated) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-[11px] border border-border bg-surface transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          className="h-4 w-4 rounded-t-full border-[1.6px] border-b-0 border-foreground-secondary"
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
            aria-label="Notifications"
            className="absolute right-0 top-12 z-10 flex max-h-[70vh] w-[360px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="border-b border-border px-4 py-3">
              <Text className="font-semibold">Notifications</Text>
            </div>
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
