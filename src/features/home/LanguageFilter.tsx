"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/src/shared/components/Select";
import {
  PACK_LANGUAGES,
  PACK_LANGUAGE_NAMES,
  type PackLanguage,
} from "@/src/shared/types/pack-language";

const ALL = "all";

/**
 * Filter over a pack's CONTENT language — what the pack is written in, not what
 * the interface is in. A single-select dropdown (matching the Sort filter); the
 * leading "All" option means no filter.
 *
 * The `languages` prop stays an array for wire compatibility with the feed API
 * (which filters on a set), but the control picks one at a time: the selected
 * value is the first entry, and "All" clears it.
 *
 * Language labels are the NATIVE names and are deliberately NOT translated — a
 * Ukrainian speaker looks for "Українська", not for whatever their current
 * interface calls Ukrainian. Same reasoning as the settings language picker.
 */
export function LanguageFilter({
  languages,
  onChange,
}: {
  languages: PackLanguage[];
  onChange: (languages: PackLanguage[]) => void;
}) {
  const t = useTranslations("home");

  const options = [
    { value: ALL, label: t("all") },
    ...PACK_LANGUAGES.map((code) => ({
      value: code,
      label: PACK_LANGUAGE_NAMES[code],
    })),
  ];

  return (
    <Select
      aria-label={t("filterByLanguage")}
      options={options}
      value={languages[0] ?? ALL}
      onChange={(event) => {
        const value = event.target.value;
        onChange(value === ALL ? [] : [value as PackLanguage]);
      }}
    />
  );
}
