"use client";

import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import {
  SORT_OPTIONS,
  WINDOW_OPTIONS,
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
  return (
    <div className="flex flex-col gap-3">
      <FilterChipRow
        options={SORT_OPTIONS}
        value={sort}
        onSelect={onSortChange}
      />
      {sort === "popular" && (
        <FilterChipRow
          options={WINDOW_OPTIONS}
          value={window}
          onSelect={onWindowChange}
        />
      )}
    </div>
  );
}
