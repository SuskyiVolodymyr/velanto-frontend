"use client";

import { useTranslations } from "next-intl";
import { Dropdown } from "@/src/shared/components/Dropdown";
import {
  PACK_LANGUAGES,
  PACK_LANGUAGE_NAMES,
  type PackLanguage,
} from "@/src/shared/types/pack-language";

const ALL = "all";

/**
 * Filter over a pack's CONTENT language — what the pack is written in, not what
 * the interface is in. Single-select; the leading "All" option means no filter.
 *
 * Uses the app's own {@link Dropdown} (button + listbox), not the native-select
 * `Select`. It sits directly in the browse bar rather than inside a popover:
 * wrapping a select in a dropdown panel meant opening a dropdown to reach a
 * dropdown. Dropdown also carries the dimension name on its trigger via
 * `prefix`, which a native select cannot do — that control can only display an
 * option's own text, so "Language:" would have had to be baked into all eleven
 * option labels.
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
  className,
}: {
  languages: PackLanguage[];
  onChange: (languages: PackLanguage[]) => void;
  /** Layout overrides for the trigger (the browse bar sizes it to the row). */
  className?: string;
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
    <Dropdown
      className={className}
      // `card` surface: this sits on the page body, where a background-coloured
      // control reads as a hole rather than a control.
      size="sm"
      surface="card"
      // Eleven languages plus "All" — tall enough that the list never scrolls.
      panelHeight="tall"
      ariaLabel={t("filterByLanguage")}
      prefix={t("groupLanguage")}
      options={options}
      value={languages[0] ?? ALL}
      onChange={(value) =>
        onChange(value === ALL ? [] : [value as PackLanguage])
      }
    />
  );
}
