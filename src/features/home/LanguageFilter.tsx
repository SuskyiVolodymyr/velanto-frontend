"use client";

import { useTranslations } from "next-intl";
import { ChipMultiSelect } from "@/src/shared/components/ChipMultiSelect";
import {
  PACK_LANGUAGES,
  PACK_LANGUAGE_NAMES,
  type PackLanguage,
} from "@/src/shared/types/pack-language";

/**
 * Multi-select filter over a pack's CONTENT language — what the pack is
 * written in, not what the interface is in. Selecting none means no filter
 * ("every language"), not "no languages".
 *
 * Inline chips rather than a modal like `TagFilter`: there are 11 languages
 * against 31 tags, so they fit the sidebar without the extra click and the
 * bulk-edit Apply flow a long list needs.
 *
 * Labels are the NATIVE names and are deliberately NOT translated — a Ukrainian
 * speaker looks for "Українська", not for whatever their current interface
 * calls Ukrainian. Same reasoning as the settings language picker.
 */
export function LanguageFilter({
  languages,
  onChange,
}: {
  languages: PackLanguage[];
  onChange: (languages: PackLanguage[]) => void;
}) {
  const t = useTranslations("home");

  return (
    <ChipMultiSelect
      groupLabel={t("filterByLanguage")}
      options={PACK_LANGUAGES.map((code) => ({
        value: code,
        label: PACK_LANGUAGE_NAMES[code],
      }))}
      selected={languages}
      onChange={onChange}
    />
  );
}
