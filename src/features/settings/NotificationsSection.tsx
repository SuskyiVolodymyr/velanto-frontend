"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { cn } from "@/src/shared/lib/cn";
import { useAuth } from "@/src/shared/lib/auth-context";
import {
  useNotificationPreferences,
  useSetNotificationPreference,
} from "@/src/features/settings/api/notifications.queries";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from "@/src/shared/types/notification";

// Each notification type maps to a `settings` translation key for its label.
const LABEL_KEYS: Record<NotificationType, string> = {
  new_follower: "notifNewFollower",
  new_pack_from_followed: "notifNewPack",
  new_comment: "notifNewComment",
  pack_deleted_warning: "notifPackDeleted",
};

export function NotificationsSection() {
  const t = useTranslations("settings");
  const { status } = useAuth();

  const prefsQuery = useNotificationPreferences({
    enabled: status === "authenticated",
  });
  const prefs = prefsQuery.data ?? null;
  const fetchError = prefsQuery.isError;

  const setPref = useSetNotificationPreference();
  // A single mutation is in flight at a time; `variables.type` scopes the
  // busy/error indicators to the row that was toggled.
  const pendingType = setPref.isPending ? setPref.variables?.type : undefined;
  const erroredType = setPref.isError ? setPref.variables?.type : undefined;

  function handleToggle(type: NotificationType) {
    if (!prefs) return;
    setPref.mutate({ type, value: !prefs[type] });
  }

  if (status === "loading") return null;

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {t("notificationsHeading")}
      </Text>
      {status === "unauthenticated" && (
        <div className="rounded-xl border border-dashed border-border-strong px-4 py-4 text-sm text-foreground-secondary">
          {t.rich("loginToManageNotifications", {
            link: (chunks) => (
              <Link href="/auth" className="text-acc">
                {chunks}
              </Link>
            ),
          })}
        </div>
      )}
      {status === "authenticated" && fetchError && (
        <Text className="text-sm text-danger">
          {t("notificationsLoadError")}
        </Text>
      )}
      {status === "authenticated" && !fetchError && !prefs && (
        <LoadingState label={t("loading")} showLabel />
      )}
      {status === "authenticated" && prefs && (
        <div className="flex flex-col gap-2">
          {NOTIFICATION_TYPES.map((type) => (
            <Card
              key={type}
              className="flex flex-col gap-1 hover:translate-y-0 hover:shadow-none"
            >
              <div className="flex items-center justify-between gap-4">
                <Text className="font-semibold">{t(LABEL_KEYS[type])}</Text>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[type]}
                  aria-label={t(LABEL_KEYS[type])}
                  disabled={pendingType === type}
                  onClick={() => handleToggle(type)}
                  className={cn(
                    "h-6 w-11 shrink-0 rounded-full border transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    prefs[type]
                      ? "border-acc bg-acc/30"
                      : "border-border bg-white/5",
                  )}
                >
                  <span
                    className={cn(
                      "block h-4 w-4 rounded-full bg-foreground transition-transform",
                      prefs[type] ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </div>
              {erroredType === type && (
                <Text className="text-xs text-danger">
                  {t("notificationUpdateError")}
                </Text>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
