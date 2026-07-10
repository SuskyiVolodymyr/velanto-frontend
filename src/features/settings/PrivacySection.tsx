"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { SegmentedControl } from "@/src/shared/components/SegmentedControl";
import { useStreamerMode } from "@/src/shared/lib/streamer-mode-context";

type StreamerModeValue = "on" | "off";

export function PrivacySection() {
  const t = useTranslations("streamerMode");
  const { enabled, setEnabled } = useStreamerMode();
  const labelId = useId();

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
        <SegmentedControl<StreamerModeValue>
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
    </section>
  );
}
