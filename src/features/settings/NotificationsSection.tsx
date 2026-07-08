"use client";

import { useEffect, useState } from "react";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { notificationsClient } from "@/src/shared/lib/notifications-client";
import { NOTIFICATION_TYPES, type NotificationPreferences, type NotificationType } from "@/src/shared/types/notification";

const LABELS: Record<NotificationType, string> = {
  new_follower: "New follower",
  new_pack_from_followed: "New pack from someone you follow",
  new_comment: "New comment on your pack",
  pack_deleted_warning: "Pack removed by a moderator",
};

export function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    notificationsClient.getPreferences().then((result) => {
      if (!cancelled) setPrefs(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle(type: NotificationType) {
    if (!prefs) return;
    const nextValue = !prefs[type];
    setBusy((prev) => ({ ...prev, [type]: true }));
    setErrors((prev) => ({ ...prev, [type]: "" }));
    try {
      const updated = await notificationsClient.setPreferences({ [type]: nextValue });
      setPrefs(updated);
    } catch {
      setErrors((prev) => ({ ...prev, [type]: "Couldn't update this setting. Try again." }));
    } finally {
      setBusy((prev) => ({ ...prev, [type]: false }));
    }
  }

  if (!prefs) return null;

  return (
    <section className="flex flex-col gap-4">
      <Text as="h2" variant="tertiary" className="text-xs uppercase tracking-wide">
        Notifications
      </Text>
      <div className="flex flex-col gap-2">
        {NOTIFICATION_TYPES.map((type) => (
          <Card key={type} className="flex flex-col gap-1 hover:translate-y-0 hover:shadow-none">
            <div className="flex items-center justify-between gap-4">
              <Text className="font-semibold">{LABELS[type]}</Text>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[type]}
                aria-label={LABELS[type]}
                disabled={busy[type]}
                onClick={() => void handleToggle(type)}
                className={cn(
                  "h-6 w-11 shrink-0 rounded-full border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  prefs[type] ? "border-acc bg-acc/30" : "border-border bg-white/5",
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
            {errors[type] && <Text className="text-xs text-[#ff6b6b]">{errors[type]}</Text>}
          </Card>
        ))}
      </div>
    </section>
  );
}
