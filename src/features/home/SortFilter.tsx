"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/src/shared/components/Select";
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

// The three top-level sorts live in a dropdown (they're mutually exclusive and
// the list is closed), while whichever sub-choice the active sort owns stays a
// chip row underneath: the popularity time window under "Popular", the
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
      <Select
        aria-label={t("groupSort")}
        options={sortOptions}
        value={sort}
        onChange={(event) =>
          onSortChange(event.target.value as SortFilterValue)
        }
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
