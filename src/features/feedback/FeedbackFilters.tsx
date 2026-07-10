import { Input } from "@/src/shared/components/Input";
import { cn } from "@/src/shared/lib/cn";
import type { FeedbackSort, FeedbackStatus, FeedbackTopic } from "@/src/shared/types/feedback";

const TOPIC_FILTERS: { value: FeedbackTopic | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "translation", label: "Translation" },
  { value: "other", label: "Other" },
];

const STATUS_FILTERS: { value: FeedbackStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "declined", label: "Declined" },
];

const SORT_OPTIONS: { value: FeedbackSort; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "new", label: "Newest" },
];

const chipClass = (active: boolean) =>
  cn(
    "rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "border-acc/30 bg-acc/10 text-acc"
      : "border-border bg-white/[0.03] text-foreground-secondary",
  );

interface FeedbackFiltersProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  topic: FeedbackTopic | undefined;
  onTopicChange: (value: FeedbackTopic | undefined) => void;
  statusFilter: FeedbackStatus | undefined;
  onStatusChange: (value: FeedbackStatus | undefined) => void;
  sort: FeedbackSort;
  onSortChange: (value: FeedbackSort) => void;
}

export function FeedbackFilters({
  searchInput,
  onSearchInputChange,
  topic,
  onTopicChange,
  statusFilter,
  onStatusChange,
  sort,
  onSortChange,
}: FeedbackFiltersProps) {
  return (
    <>
      <div className="max-w-sm">
        <Input
          type="search"
          aria-label="Search feedback"
          placeholder="Search feedback…"
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TOPIC_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => onTopicChange(f.value)}
            aria-pressed={topic === f.value}
            className={chipClass(topic === f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => onStatusChange(f.value)}
            aria-pressed={statusFilter === f.value}
            className={chipClass(statusFilter === f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSortChange(option.value)}
            aria-pressed={sort === option.value}
            className={chipClass(sort === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}
