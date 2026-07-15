"use client";

import { useTranslations } from "next-intl";
import type { ReportStatus, ReportType } from "@/src/shared/types/report";

const STATUS_FILTERS: { value: ReportStatus | undefined; labelKey: string }[] = [
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
        <button
          key={f.labelKey}
          type="button"
          onClick={() => onStatusChange(f.value)}
          aria-pressed={statusFilter === f.value}
          className={`rounded-[9px] border px-3.5 py-2 text-sm font-medium ${
            statusFilter === f.value
              ? "border-acc/40 bg-acc/10 text-acc"
              : "border-border bg-white/[0.02] text-foreground-secondary"
          }`}
        >
          {t(f.labelKey)}
        </button>
      ))}
      <div className="flex-1" />
      {TYPE_FILTERS.map((f) => (
        <button
          key={f.labelKey}
          type="button"
          onClick={() => onTypeChange(f.value)}
          aria-pressed={typeFilter === f.value}
          className={`rounded-[9px] border px-3.5 py-2 text-sm font-medium ${
            typeFilter === f.value
              ? "border-acc/40 bg-acc/10 text-acc"
              : "border-border bg-white/[0.02] text-foreground-secondary"
          }`}
        >
          {t(f.labelKey)}
        </button>
      ))}
    </div>
  );
}
