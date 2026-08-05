"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
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

/**
 * The feed's sort: the top-level choice, then whichever sub-choice that choice
 * owns — the popularity window under "Popular", the direction under "Date".
 *
 * The two rows used to sit unlabelled and flush against each other, which made
 * seven chips look like one set with two of them lit, and gave no clue that the
 * second row's meaning changed with the first. They are two questions, so each
 * now carries its own heading, and a rule separates them. The sub-heading is
 * named for the sort it belongs to ("Time range" vs "Order") rather than
 * something generic, so the dependency is visible rather than inferred.
 */
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

  return (
    <div className="flex flex-col gap-3">
      <Group label={t("groupSort")}>
        <FilterChipRow
          options={SORT_VALUES.map((value) => ({
            value,
            label: t(SORT_LABEL_KEYS[value]),
          }))}
          value={sort}
          onSelect={onSortChange}
        />
      </Group>

      <div className="border-t border-border" />

      {sort === "popular" ? (
        <Group label={t("groupWindow")}>
          <FilterChipRow
            options={WINDOW_VALUES.map((value) => ({
              value,
              label: t(WINDOW_LABEL_KEYS[value]),
            }))}
            value={window}
            onSelect={onWindowChange}
          />
        </Group>
      ) : (
        <Group label={t("groupOrder")}>
          <FilterChipRow
            options={DATE_ORDER_VALUES.map((value) => ({
              value,
              label: t(DATE_ORDER_LABEL_KEYS[value]),
            }))}
            value={dateOrder}
            onSelect={onDateOrderChange}
          />
        </Group>
      )}
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Text
        as="h3"
        variant="tertiary"
        className="text-[11px] font-bold uppercase tracking-[0.08em]"
      >
        {label}
      </Text>
      {children}
    </div>
  );
}
