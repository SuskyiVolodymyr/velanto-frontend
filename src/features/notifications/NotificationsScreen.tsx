"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useNotifications } from "@/src/shared/components/use-notifications";
import { NotificationList } from "@/src/shared/components/NotificationList";
import { NotificationsPanelHeader } from "@/src/shared/components/NotificationsPanelHeader";

/**
 * Full-page notifications list — the phone bottom nav's Notifications tab (the
 * header's bell dropdown is hidden on mobile). Reuses the same data hook, header
 * and list the bell uses, so the two never diverge. Signed out it renders a
 * sign-in prompt in place of the list rather than redirecting.
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
  // Read the auth machine's own status, not the notifications hook's
  // `authenticated` — that is false while auth is still loading, and would show
  // a signed-in user the signed-out state on first paint.
  const { status } = useAuth();
  const router = useRouter();
  const tAuth = useTranslations("auth");

  // Nothing to render until auth resolves; the alternative flashes the wrong
  // state for a frame.
  if (status === "loading") return null;

  // Signed out this used to `router.replace("/auth")`. A visitor who lands here
  // from a link had the page swapped out from under them with no explanation,
  // which is the surprise redirect the anon-gate rule exists to prevent. Show
  // the page, hide the list and its mark-all-read control, and let them choose.
  if (status !== "authenticated") {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-14 text-center">
          <Text as="h1" variant="title" className="text-lg">
            {tAuth("gateHeading")}
          </Text>
          <Text variant="secondary">{tAuth("logInToSeeNotifications")}</Text>
          <Button onClick={() => router.push("/auth?next=%2Fnotifications")}>
            {tAuth("logIn")}
          </Button>
        </div>
      </main>
    );
  }

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
