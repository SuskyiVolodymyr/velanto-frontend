"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
import { Text } from "@/src/shared/components/Text";
import type { PackTag } from "@/src/shared/types/pack";
import { PackSearchField } from "@/src/features/home/PackSearchField";
import { FormatFilter } from "@/src/features/home/FormatFilter";
import { SortFilter } from "@/src/features/home/SortFilter";
import { TagFilter } from "@/src/features/home/TagFilter";
import type {
  FormatFilterValue,
  SortFilterValue,
  WindowFilterValue,
} from "@/src/features/home/filter-options";

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

// Sticky right-hand filter panel for the home feed. Purely presentational: it
// composes the search + filter child components and lifts every change up to
// the useHomeFeed hook via the passed-in callbacks.
export function HomeFilterSidebar({
  className,
  search,
  onSearchChange,
  format,
  onFormatChange,
  sort,
  onSortChange,
  window,
  onWindowChange,
  tags,
  onTagsChange,
}: {
  className?: string;
  search: string;
  onSearchChange: (value: string) => void;
  format: FormatFilterValue;
  onFormatChange: (value: FormatFilterValue) => void;
  sort: SortFilterValue;
  onSortChange: (value: SortFilterValue) => void;
  window: WindowFilterValue;
  onWindowChange: (value: WindowFilterValue) => void;
  tags: PackTag[];
  onTagsChange: (tags: PackTag[]) => void;
}) {
  const t = useTranslations("home");

  return (
    <aside
      aria-label={t("filters")}
      className={cn(
        "lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto",
        className,
      )}
    >
      <div className="flex flex-col gap-5 rounded-[14px] border border-border bg-white/[0.02] p-5">
        <PackSearchField value={search} onChange={onSearchChange} />

        <FilterGroup label={t("groupFormat")}>
          <FormatFilter value={format} onSelect={onFormatChange} />
        </FilterGroup>

        <FilterGroup label={t("groupSort")}>
          <SortFilter
            sort={sort}
            onSortChange={onSortChange}
            window={window}
            onWindowChange={onWindowChange}
          />
        </FilterGroup>

        <FilterGroup label={t("groupTags")}>
          <TagFilter tags={tags} onChange={onTagsChange} />
        </FilterGroup>
      </div>
    </aside>
  );
}
