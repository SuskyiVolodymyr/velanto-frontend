"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { SettingsSectionSkeleton } from "@/src/features/settings/SettingsSectionSkeleton";
import { Text } from "@/src/shared/components/Text";
import { SegmentedControl } from "@/src/shared/components/SegmentedControl";
import { PlayHistoryToggle } from "@/src/shared/components/PlayHistoryToggle";
import { useStreamerMode } from "@/src/shared/lib/streamer-mode-context";
import { useAuth } from "@/src/shared/lib/auth-context";

type ToggleValue = "on" | "off";

export function PrivacySection() {
  const t = useTranslations("streamerMode");
  const { enabled, setEnabled } = useStreamerMode();
  const { status } = useAuth();
  const labelId = useId();

  if (status === "loading") return <SettingsSectionSkeleton />;

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {t("settingsHeading")}
      </Text>

      <Card className="flex items-center justify-between gap-4">
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
          stretch
          value={enabled ? "on" : "off"}
          onChange={(value) => setEnabled(value === "on")}
          options={[
            { value: "on", label: t("on"), tone: "accent" as const },
            { value: "off", label: t("off") },
          ]}
        />
      </Card>

      <PlayHistoryToggle />
    </section>
  );
}
