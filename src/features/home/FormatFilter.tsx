"use client";

import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import {
  FORMAT_OPTIONS,
  type FormatFilterValue,
} from "@/src/features/home/filter-options";

// Single-select pack format filter (All / Save One / Sacrifice One / …).
export function FormatFilter({
  value,
  onSelect,
}: {
  value: FormatFilterValue;
  onSelect: (value: FormatFilterValue) => void;
}) {
  return (
    <FilterChipRow options={FORMAT_OPTIONS} value={value} onSelect={onSelect} />
  );
}
