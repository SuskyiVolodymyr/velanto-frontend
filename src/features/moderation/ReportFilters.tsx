"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
import type { ReportStatus, ReportType } from "@/src/shared/types/report";

const STATUS_FILTERS: { value: ReportStatus | undefined; labelKey: string }[] =
  [
    { value: undefined, labelKey: "filterAll" },
    { value: "new", labelKey: "filterNew" },
    { value: "reviewing", labelKey: "filterReviewing" },
    { value: "closed", labelKey: "filterClosed" },
  ];

const TYPE_FILTERS: { value: ReportType | undefined; labelKey: string }[] = [
  { value: undefined, labelKey: "filterAllTypes" },
  { value: "pack", labelKey: "filterPacks" },
  { value: "user", labelKey: "filterUsers" },
  { value: "round", labelKey: "filterRounds" },
];

interface ReportFiltersProps {
  statusFilter: ReportStatus | undefined;
  onStatusChange: (value: ReportStatus | undefined) => void;
  typeFilter: ReportType | undefined;
  onTypeChange: (value: ReportType | undefined) => void;
}

// One chip, at the mock's 38px / 10px-radius / 13px-semibold geometry. Idle and
// active are whole alternative strings, never a base plus an override: `cn()` is
// a plain join, so layering a colour would leave both in the class list.
function FilterChip({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "h-[38px] rounded-[10px] border px-[14px] text-[13px] font-semibold transition-colors",
        active
          ? "border-acc/40 bg-acc/10 text-acc"
          : "border-border bg-white/[0.02] text-foreground-secondary hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/**
 * The report queue's two chip groups: status on the left, type pushed to the
 * right by a spacer, per the mock. They wrap onto their own rows below ~700px,
 * where the spacer collapses and the groups stack left-aligned.
 */
export function ReportFilters({
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
}: ReportFiltersProps) {
  const t = useTranslations("moderation");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_FILTERS.map((f) => (
        <FilterChip
          key={f.labelKey}
          label={t(f.labelKey)}
          active={statusFilter === f.value}
          onSelect={() => onStatusChange(f.value)}
        />
      ))}
      <div className="flex-1" />
      {TYPE_FILTERS.map((f) => (
        <FilterChip
          key={f.labelKey}
          label={t(f.labelKey)}
          active={typeFilter === f.value}
          onSelect={() => onTypeChange(f.value)}
        />
      ))}
    </div>
  );
}
