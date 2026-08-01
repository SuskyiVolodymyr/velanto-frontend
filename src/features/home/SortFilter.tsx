"use client";

import { useTranslations } from "next-intl";
import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import {
  DATE_ORDER_LABEL_KEYS,
  DATE_ORDER_VALUES,
  SORT_LABEL_KEYS,
  SORT_VALUES,
  WINDOW_VALUES,
  WINDOW_LABEL_KEYS,
  type DateOrderValue,
  type SortFilterValue,
  type WindowFilterValue,
} from "@/src/features/home/filter-options";

// The two top-level sorts are a single-select chip row (they live inside the
// browse bar's sort popover), while whichever sub-choice the active sort owns
// stays a chip row underneath: the popularity time window under "Popular", the
// newest/oldest direction under "Date". At most one sub-row is ever visible.
export function SortFilter({
  sort,
  onSortChange,
  window,
  onWindowChange,
  dateOrder,
  onDateOrderChange,
}: {
  sort: SortFilterValue;
  onSortChange: (value: SortFilterValue) => void;
  window: WindowFilterValue;
  onWindowChange: (value: WindowFilterValue) => void;
  dateOrder: DateOrderValue;
  onDateOrderChange: (value: DateOrderValue) => void;
}) {
  const t = useTranslations("home");

  const sortOptions = SORT_VALUES.map((value) => ({
    value,
    label: t(SORT_LABEL_KEYS[value]),
  }));

  const windowOptions = WINDOW_VALUES.map((value) => ({
    value,
    label: t(WINDOW_LABEL_KEYS[value]),
  }));

  const dateOrderOptions = DATE_ORDER_VALUES.map((value) => ({
    value,
    label: t(DATE_ORDER_LABEL_KEYS[value]),
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
      {sort === "date" && (
        <FilterChipRow
          options={dateOrderOptions}
          value={dateOrder}
          onSelect={onDateOrderChange}
        />
      )}
    </div>
  );
}
