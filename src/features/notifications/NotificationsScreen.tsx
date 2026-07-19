"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useNotifications } from "@/src/shared/components/use-notifications";
import { NotificationList } from "@/src/shared/components/NotificationList";
import { NotificationsPanelHeader } from "@/src/shared/components/NotificationsPanelHeader";

/**
 * Full-page notifications list — the phone bottom nav's Notifications tab (the
 * header's bell dropdown is hidden on mobile). Reuses the same data hook, header
 * and list the bell uses, so the two never diverge. Self-guards to /auth.
 */
export function NotificationsScreen() {
  const {
    notifications,
    total,
    newCount,
    markAllRead,
    listLoading,
    listError,
    listReady,
    loadingMore,
    loadMoreError,
    handleLoadMore,
  } = useNotifications({ alwaysOpen: true });
  // Key the redirect on the auth machine's own status, not the notifications
  // hook's `authenticated` (which is false while auth is still loading and would
  // bounce a signed-in user to /auth on first paint).
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth");
  }, [status, router]);

  if (status !== "authenticated") return null;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8">
      <div className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
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
          onNavigate={() => {}}
        />
      </div>
    </main>
  );
}
