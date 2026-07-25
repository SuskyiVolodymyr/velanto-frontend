"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { Popover } from "@/src/shared/components/Popover";
import type { PackTag } from "@/src/shared/types/pack";
import type { PackLanguage } from "@/src/shared/types/pack-language";
import { FormatFilter } from "@/src/features/home/FormatFilter";
import { SortFilter } from "@/src/features/home/SortFilter";
import { TagFilter } from "@/src/features/home/TagFilter";
import { LanguageFilter } from "@/src/features/home/LanguageFilter";
import {
  SORT_LABEL_KEYS,
  type DateOrderValue,
  type FormatFilterValue,
  type SortFilterValue,
  type WindowFilterValue,
} from "@/src/features/home/filter-options";

const TRIGGER_CLASS =
  "flex h-[34px] items-center gap-2 rounded-pill border border-white/[0.09] " +
  "bg-surface-card px-[13px] text-[13px] font-semibold text-foreground-secondary " +
  "transition-colors hover:text-foreground focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-acc";

const PANEL_CLASS =
  "flex flex-col gap-4 rounded-[14px] border border-border bg-surface p-4 " +
  "shadow-[0_16px_40px_rgba(0,0,0,0.5)]";

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Text
        as="h2"
        variant="secondary"
        className="text-xs font-semibold uppercase tracking-wide"
      >
        {label}
      </Text>
      {children}
    </div>
  );
}

/**
 * The browse feed's filter row (2.0.0). Inline format pills carry the primary
 * choice; the secondary filters (content tags + language) live behind a
 * "Filters" popover, and the sort behind its own popover showing the active
 * sort — so the row stays compact on a dense grid. Purely presentational: every
 * change lifts to the useHomeFeed hook. Replaces the old right-hand
 * HomeFilterSidebar; search moved to the global top bar in D1b-i.
 */
export function BrowseFilterBar({
  format,
  onFormatChange,
  sort,
  onSortChange,
  window,
  onWindowChange,
  dateOrder,
  onDateOrderChange,
  tags,
  onTagsChange,
  languages,
  onLanguagesChange,
}: {
  format: FormatFilterValue;
  onFormatChange: (value: FormatFilterValue) => void;
  sort: SortFilterValue;
  onSortChange: (value: SortFilterValue) => void;
  window: WindowFilterValue;
  onWindowChange: (value: WindowFilterValue) => void;
  dateOrder: DateOrderValue;
  onDateOrderChange: (value: DateOrderValue) => void;
  tags: PackTag[];
  onTagsChange: (tags: PackTag[]) => void;
  languages: PackLanguage[];
  onLanguagesChange: (languages: PackLanguage[]) => void;
}) {
  const t = useTranslations("home");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FormatFilter value={format} onSelect={onFormatChange} />

      <div className="ms-auto flex items-center gap-2">
        <Popover
          label={
            <>
              <SlidersHorizontal size={15} strokeWidth={2} aria-hidden />
              {t("filters")}
            </>
          }
          panelLabel={t("filters")}
          align="end"
          triggerClassName={TRIGGER_CLASS}
          panelClassName={`${PANEL_CLASS} w-[min(280px,80vw)]`}
        >
          <FilterGroup label={t("groupTags")}>
            <TagFilter tags={tags} onChange={onTagsChange} />
          </FilterGroup>
          <FilterGroup label={t("groupLanguage")}>
            <LanguageFilter
              languages={languages}
              onChange={onLanguagesChange}
            />
          </FilterGroup>
        </Popover>

        <Popover
          label={
            <>
              {t(SORT_LABEL_KEYS[sort])}
              <ChevronDown size={15} strokeWidth={2} aria-hidden />
            </>
          }
          triggerAriaLabel={t("groupSort")}
          panelLabel={t("groupSort")}
          align="end"
          triggerClassName={TRIGGER_CLASS}
          panelClassName={`${PANEL_CLASS} w-[220px]`}
        >
          <SortFilter
            sort={sort}
            onSortChange={onSortChange}
            window={window}
            onWindowChange={onWindowChange}
            dateOrder={dateOrder}
            onDateOrderChange={onDateOrderChange}
          />
        </Popover>
      </div>
    </div>
  );
}
