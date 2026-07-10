"use client";

import { useTranslations } from "next-intl";
import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import {
  FORMAT_FILTER_VALUES,
  type FormatFilterValue,
} from "@/src/features/home/filter-options";

// Single-select pack format filter (All / Save One / Sacrifice One / …).
// "all" is labelled from the home namespace; the real format names come from
// the shared `formats` namespace so they match the pack card badges.
export function FormatFilter({
  value,
  onSelect,
}: {
  value: FormatFilterValue;
  onSelect: (value: FormatFilterValue) => void;
}) {
  const t = useTranslations("home");
  const tFormat = useTranslations("formats");

  const options = FORMAT_FILTER_VALUES.map((format) => ({
    value: format,
    label: format === "all" ? t("all") : tFormat(format),
  }));

  return <FilterChipRow options={options} value={value} onSelect={onSelect} />;
}
