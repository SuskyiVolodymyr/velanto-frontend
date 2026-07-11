"use client";

import { useTranslations } from "next-intl";
import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import {
  SORT_VALUES,
  WINDOW_VALUES,
  WINDOW_LABEL_KEYS,
  type SortFilterValue,
  type WindowFilterValue,
} from "@/src/features/home/filter-options";

// Sort selector plus the popularity time-window sub-row, which only appears
// while "Popular" is the active sort.
export function SortFilter({
  sort,
  onSortChange,
  window,
  onWindowChange,
}: {
  sort: SortFilterValue;
  onSortChange: (value: SortFilterValue) => void;
  window: WindowFilterValue;
  onWindowChange: (value: WindowFilterValue) => void;
}) {
  const t = useTranslations("home");

  const sortOptions = SORT_VALUES.map((value) => ({
    value,
    label: value === "relevance" ? t("sortRelevance") : t("sortPopular"),
  }));

  const windowOptions = WINDOW_VALUES.map((value) => ({
    value,
    label: t(WINDOW_LABEL_KEYS[value]),
  }));

  return (
    <div className="flex flex-col gap-3">
      <FilterChipRow
        options={sortOptions}
        value={sort}
        onSelect={onSortChange}
      />
      {sort === "popular" && (
        <FilterChipRow
          options={windowOptions}
          value={window}
          onSelect={onWindowChange}
        />
      )}
    </div>
  );
}
