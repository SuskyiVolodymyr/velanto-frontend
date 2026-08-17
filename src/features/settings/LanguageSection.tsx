"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/ui/Card";
import { Text } from "@/ui/Text";
import { LanguageSelector } from "@/features/settings/LanguageSelector";

export function LanguageSection() {
  const t = useTranslations("settings");
  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {t("languageHeading")}
      </Text>
      <Card className="flex items-center justify-between gap-4">
        <div>
          <Text className="font-semibold">{t("languageLabel")}</Text>
          <Text variant="secondary" className="text-sm">
            {t("languageHint")}
          </Text>
        </div>
        <LanguageSelector />
      </Card>
    </section>
  );
}
