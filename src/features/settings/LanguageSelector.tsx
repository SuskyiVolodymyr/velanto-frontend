"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/src/i18n/config";
import { setUserLocale } from "@/src/i18n/locale";

export function LanguageSelector() {
  const locale = useLocale();
  const t = useTranslations("settings");

  return (
    <select
      aria-label={t("languageSelectAria")}
      value={locale}
      onChange={(event) => void setUserLocale(event.target.value as Locale)}
      className="rounded-[11px] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
    >
      {LOCALES.map((code) => (
        <option key={code} value={code}>
          {LOCALE_NAMES[code]}
        </option>
      ))}
    </select>
  );
}
