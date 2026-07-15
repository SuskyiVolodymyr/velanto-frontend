"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { SegmentedControl } from "@/src/shared/components/SegmentedControl";
import { useStreamerMode } from "@/src/shared/lib/streamer-mode-context";
import { useAuth } from "@/src/shared/lib/auth-context";
import {
  useMyProfile,
  useSetPlayHistory,
} from "@/src/features/settings/api/preferences.queries";

type ToggleValue = "on" | "off";

export function PrivacySection() {
  const t = useTranslations("streamerMode");
  const tSettings = useTranslations("settings");
  const { enabled, setEnabled } = useStreamerMode();
  const { status } = useAuth();
  const labelId = useId();
  const playHistoryLabelId = useId();

  const isAuthed = status === "authenticated";
  const profileQuery = useMyProfile({ enabled: isAuthed });
  const setPlayHistory = useSetPlayHistory();
  // While a toggle is in flight, show its pending value so the control doesn't
  // visibly snap back before the server confirms.
  const showPlayHistory = setPlayHistory.isPending
    ? setPlayHistory.variables
    : profileQuery.data?.showPlayHistory;

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {t("settingsHeading")}
      </Text>

      <Card className="flex items-center justify-between gap-4 hover:translate-y-0 hover:shadow-none">
        <div>
          <Text id={labelId} className="font-semibold">
            {t("settingsLabel")}
          </Text>
          <Text variant="secondary" className="text-sm">
            {t("settingsDescription")}
          </Text>
        </div>
        <SegmentedControl<ToggleValue>
          ariaLabel={t("settingsLabel")}
          aria-describedby={labelId}
          className="w-[140px] shrink-0"
          value={enabled ? "on" : "off"}
          onChange={(value) => setEnabled(value === "on")}
          options={[
            { value: "on", label: t("on") },
            { value: "off", label: t("off") },
          ]}
        />
      </Card>

      {isAuthed && showPlayHistory !== undefined && (
        <Card className="flex items-center justify-between gap-4 hover:translate-y-0 hover:shadow-none">
          <div>
            <Text id={playHistoryLabelId} className="font-semibold">
              {tSettings("playHistoryLabel")}
            </Text>
            <Text variant="secondary" className="text-sm">
              {tSettings("playHistoryDescription")}
            </Text>
          </div>
          <SegmentedControl<ToggleValue>
            ariaLabel={tSettings("playHistoryLabel")}
            aria-describedby={playHistoryLabelId}
            className="w-[140px] shrink-0"
            value={showPlayHistory ? "on" : "off"}
            onChange={(value) => setPlayHistory.mutate(value === "on")}
            options={[
              { value: "on", label: t("on") },
              { value: "off", label: t("off") },
            ]}
          />
        </Card>
      )}
    </section>
  );
}
