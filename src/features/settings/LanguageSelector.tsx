"use client";

import { useLocale, useTranslations } from "next-intl";
import { Select } from "@/src/shared/components/Select";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/src/i18n/config";
import { setUserLocale } from "@/src/i18n/locale";

export function LanguageSelector() {
  const locale = useLocale();
  const t = useTranslations("settings");

  // Reuse the shared Select so the picker matches every other dropdown — the
  // suppressed native arrow replaced by our bordered inset chevron. Capped width
  // (via max-w, which doesn't fight Select's own `w-full`) keeps it compact in
  // the settings row rather than stretching across the card.
  return (
    <Select
      aria-label={t("languageSelectAria")}
      value={locale}
      onChange={(event) => void setUserLocale(event.target.value as Locale)}
      className="max-w-[190px]"
    >
      {LOCALES.map((code) => (
        <option key={code} value={code}>
          {LOCALE_NAMES[code]}
        </option>
      ))}
    </Select>
  );
}
