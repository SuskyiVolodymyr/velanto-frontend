"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { LanguageSection } from "@/src/features/settings/LanguageSection";
import { AppearanceSection } from "@/src/features/settings/AppearanceSection";
import { NotificationsSection } from "@/src/features/settings/NotificationsSection";
import { AccountSection } from "@/src/features/settings/AccountSection";

export function SettingsScreen() {
  const t = useTranslations("settings");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-7 py-10">
      <Text as="h1" variant="title" className="text-3xl">
        {t("title")}
      </Text>
      <LanguageSection />
      <AppearanceSection />
      <NotificationsSection />
      <AccountSection />
    </main>
  );
}
