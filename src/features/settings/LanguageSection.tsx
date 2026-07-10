"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { LanguageSelector } from "@/src/features/settings/LanguageSelector";

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
      <Card className="flex items-center justify-between gap-4 hover:translate-y-0 hover:shadow-none">
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
