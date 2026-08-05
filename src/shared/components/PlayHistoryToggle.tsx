"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { SegmentedControl } from "@/src/shared/components/SegmentedControl";
import { cn } from "@/src/shared/lib/cn";
import { useAuth } from "@/src/shared/lib/auth-context";
import {
  useMyProfile,
  useSetPlayHistory,
} from "@/src/features/settings/api/preferences.queries";

type ToggleValue = "on" | "off";

/**
 * The single "Show play history publicly" control, wired to the one real
 * `showPlayHistory` preference (`useMyProfile` + `useSetPlayHistory`).
 *
 * Shared between `PrivacySection` (the Preferences page's Privacy card) and
 * the profile History tab's own-profile view (`RecentlyPlayedSection`) — see
 * the profile/preferences redesign plan's T5/D5. Hoisted here (rather than
 * each surface calling `useSetPlayHistory` itself) specifically so the two
 * can never disagree about the current value or race each other's mutation.
 *
 * `PrivacySection` renders this directly (migrated in T11 alongside the rest
 * of that section's restyle). New callers should do the same rather than
 * re-deriving the wiring.
 *
 * Renders nothing while signed out, or before the profile query has
 * resolved a value — callers don't need to gate on auth/loading themselves.
 */
export function PlayHistoryToggle({ className }: { className?: string }) {
  const tSettings = useTranslations("settings");
  // "On"/"Off" copy already lives in the streamerMode catalog and is reused
  // for this toggle too — same convention PrivacySection's own control uses
  // today, kept so no new i18n key is needed (plan T5's "New i18n: none").
  const tOnOff = useTranslations("streamerMode");
  const { status } = useAuth();
  const labelId = useId();

  const isAuthed = status === "authenticated";
  const profileQuery = useMyProfile({ enabled: isAuthed });
  const setPlayHistory = useSetPlayHistory();
  // While a toggle is in flight, show its pending value so the control doesn't
  // visibly snap back before the server confirms.
  const showPlayHistory = setPlayHistory.isPending
    ? setPlayHistory.variables
    : profileQuery.data?.showPlayHistory;

  if (!isAuthed || showPlayHistory === undefined) return null;

  return (
    <Card className={cn("flex items-center justify-between gap-4", className)}>
      <div>
        <Text id={labelId} className="font-semibold">
          {tSettings("playHistoryLabel")}
        </Text>
        <Text variant="secondary" className="text-sm">
          {tSettings("playHistoryDescription")}
        </Text>
      </div>
      <SegmentedControl<ToggleValue>
        ariaLabel={tSettings("playHistoryLabel")}
        aria-describedby={labelId}
        className="w-[140px] shrink-0"
        stretch
        value={showPlayHistory ? "on" : "off"}
        onChange={(value) => setPlayHistory.mutate(value === "on")}
        options={[
          { value: "on", label: tOnOff("on"), tone: "accent" as const },
          { value: "off", label: tOnOff("off") },
        ]}
      />
    </Card>
  );
}
