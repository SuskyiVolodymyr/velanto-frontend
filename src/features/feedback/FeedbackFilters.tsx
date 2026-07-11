import { useTranslations } from "next-intl";
import { Input } from "@/src/shared/components/Input";
import { cn } from "@/src/shared/lib/cn";
import type {
  FeedbackSort,
  FeedbackStatus,
  FeedbackTopic,
} from "@/src/shared/types/feedback";

// value → translation key. `undefined` (the "All" chip) resolves to filterAll;
// topic keys live in the `feedback` ns, status keys in the `status` ns.
const TOPIC_FILTERS: { value: FeedbackTopic | undefined; key: string }[] = [
  { value: undefined, key: "filterAll" },
  { value: "bug", key: "topicBug" },
  { value: "feature", key: "topicFeature" },
  { value: "translation", key: "topicTranslation" },
  { value: "other", key: "topicOther" },
];

// The "All" chip (undefined) resolves to feedback.filterAll; the rest use the
// shared `status` ns keys (feedbackNew/…), so the labels match the badges.
const STATUS_FILTERS: {
  value: FeedbackStatus | undefined;
  key: string | null;
}[] = [
  { value: undefined, key: null },
  { value: "new", key: "feedbackNew" },
  { value: "in_progress", key: "feedbackInProgress" },
  { value: "done", key: "feedbackDone" },
  { value: "declined", key: "feedbackDeclined" },
];

const SORT_OPTIONS: { value: FeedbackSort; key: string }[] = [
  { value: "top", key: "sortTop" },
  { value: "new", key: "sortNewest" },
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
  const t = useTranslations("feedback");
  const tStatus = useTranslations("status");
  return (
    <>
      <div className="max-w-sm">
        <Input
          type="search"
          aria-label={t("searchAria")}
          placeholder={t("searchPlaceholder")}
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TOPIC_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onTopicChange(f.value)}
            aria-pressed={topic === f.value}
            className={chipClass(topic === f.value)}
          >
            {t(f.key)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value ?? "all"}
            type="button"
            onClick={() => onStatusChange(f.value)}
            aria-pressed={statusFilter === f.value}
            className={chipClass(statusFilter === f.value)}
          >
            {f.key ? tStatus(f.key) : t("filterAll")}
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
            {t(option.key)}
          </button>
        ))}
      </div>
    </>
  );
}
