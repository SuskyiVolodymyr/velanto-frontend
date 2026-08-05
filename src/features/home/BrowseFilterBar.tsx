"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SlidersIcon, ChevronDownIcon } from "@/src/shared/components/icons";
import { Popover } from "@/src/shared/components/Popover";
import type { PackTag } from "@/src/shared/types/pack";
import type { PackLanguage } from "@/src/shared/types/pack-language";
import { FormatFilter } from "@/src/features/home/FormatFilter";
import { SortFilter } from "@/src/features/home/SortFilter";
import { TagPickerModal } from "@/src/shared/components/TagPickerModal";
import { LanguageFilter } from "@/src/features/home/LanguageFilter";
import { ActiveFilterChips } from "@/src/features/home/ActiveFilterChips";
import {
  SORT_LABEL_KEYS,
  WINDOW_LABEL_KEYS,
  DATE_ORDER_LABEL_KEYS,
  type DateOrderValue,
  type FormatFilterValue,
  type SortFilterValue,
  type WindowFilterValue,
} from "@/src/features/home/filter-options";

const PANEL_CLASS =
  "flex flex-col rounded-[14px] border border-border bg-surface p-4 " +
  "shadow-[0_16px_40px_rgba(0,0,0,0.5)] w-[min(280px,85vw)]";

const TRIGGER_CLASS =
  "flex h-[34px] items-center gap-2 rounded-pill border border-white/[0.09] " +
  "bg-surface-card px-[13px] text-[13px] font-semibold text-foreground-secondary " +
  "transition-colors hover:text-foreground focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-acc";

/**
 * The browse feed's filter row. Inline format pills carry the primary choice;
 * tags, language and sort each get their OWN named trigger showing their own
 * current value.
 *
 * They used to share a "Filters" popover (tags + language together) plus a
 * trigger showing the bare sort value. Two unrelated dimensions in one unnamed
 * bag gave no clue what was inside, and a button reading "Popular" reads as a
 * description of the feed rather than a control — nothing suggested Date was
 * even an option. One trigger per dimension, each labelled with what it
 * controls, is what makes the choices discoverable.
 *
 * Purely presentational: every change lifts to the useHomeFeed hook. Replaces
 * the old right-hand HomeFilterSidebar; search moved to the global top bar.
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
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  // Both halves on the trigger: "Popular" alone never said popular over what
  // period, and the window row was invisible until the panel was opened.
  const sortSummary = `${t("groupSort")}: ${t(SORT_LABEL_KEYS[sort])} · ${
    sort === "popular"
      ? t(WINDOW_LABEL_KEYS[window])
      : t(DATE_ORDER_LABEL_KEYS[dateOrder])
  }`;

  return (
    <div className="flex flex-col gap-2.5">
      {/* justify-between rather than an auto margin on the filter group. Both
          push the filters to the end while the two groups share a row, but the
          margin keeps pushing after they wrap — leaving the filters alone on
          their own line, jammed right, behind a dead gap. A wrapped line here
          holds a single item, and space-between puts a lone item at the start,
          so the alignment follows the actual wrap instead of a guessed
          breakpoint (the old `max-[480px]` stopped matching as soon as this
          group grew a third control). */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FormatFilter value={format} onSelect={onFormatChange} />

        <div className="flex flex-wrap items-center gap-2">
          {/* Opens the picker directly. It used to be a popover whose only
              content was a button that opened this same modal — two clicks and
              an intermediate surface to reach one destination. A trigger whose
              panel holds a single control should just be that control. */}
          <button
            type="button"
            onClick={() => setTagPickerOpen(true)}
            className={TRIGGER_CLASS}
          >
            <SlidersIcon size={15} strokeWidth={2} />
            {t("groupTags")}
            {tags.length > 0 && (
              // Plain digit, no ICU plural: the count sits in its own badge
              // rather than inside a sentence, so no locale needs to agree
              // with it grammatically.
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-acc px-1 text-[11px] font-bold text-background">
                {tags.length}
              </span>
            )}
          </button>

          {/* The app's own Dropdown, straight in the row — it carries its own
              name and value on the trigger, so it needs no wrapper popover. */}
          <LanguageFilter
            languages={languages}
            onChange={onLanguagesChange}
            className="w-[172px]"
          />

          {/* Stays a popover rather than becoming a flat Dropdown: the sort is
              genuinely two dependent questions, and flattening them into seven
              "Popular · Month" rows hides that structure instead of showing
              it. The trigger carries both parts so the panel never has to be
              opened just to read the current state. */}
          <Popover
            label={
              <>
                {sortSummary}
                <ChevronDownIcon size={15} strokeWidth={2} />
              </>
            }
            panelLabel={t("groupSort")}
            align="end"
            triggerClassName={TRIGGER_CLASS}
            panelClassName={PANEL_CLASS}
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

      <ActiveFilterChips
        tags={tags}
        onTagsChange={onTagsChange}
        languages={languages}
        onLanguagesChange={onLanguagesChange}
      />

      <TagPickerModal
        open={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        selected={tags}
        onChange={onTagsChange}
      />
    </div>
  );
}
