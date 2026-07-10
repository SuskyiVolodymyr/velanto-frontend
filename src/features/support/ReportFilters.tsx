import type { ReportStatus, ReportType } from "@/src/shared/types/report";

const STATUS_FILTERS: { value: ReportStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "closed", label: "Closed" },
];

const TYPE_FILTERS: { value: ReportType | undefined; label: string }[] = [
  { value: undefined, label: "All types" },
  { value: "pack", label: "Packs" },
  { value: "user", label: "Users" },
  { value: "round", label: "Rounds" },
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_FILTERS.map((f) => (
        <button
          key={f.label}
          type="button"
          onClick={() => onStatusChange(f.value)}
          aria-pressed={statusFilter === f.value}
          className={`rounded-[9px] border px-3.5 py-2 text-sm font-medium ${
            statusFilter === f.value ? "border-acc/40 bg-acc/10 text-acc" : "border-border bg-white/[0.02] text-foreground-secondary"
          }`}
        >
          {f.label}
        </button>
      ))}
      <div className="flex-1" />
      {TYPE_FILTERS.map((f) => (
        <button
          key={f.label}
          type="button"
          onClick={() => onTypeChange(f.value)}
          aria-pressed={typeFilter === f.value}
          className={`rounded-[9px] border px-3.5 py-2 text-sm font-medium ${
            typeFilter === f.value ? "border-acc/40 bg-acc/10 text-acc" : "border-border bg-white/[0.02] text-foreground-secondary"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
