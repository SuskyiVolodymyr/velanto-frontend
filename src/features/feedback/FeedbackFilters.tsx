import { useTranslations } from "next-intl";
import { SearchField } from "@/src/shared/components/SearchField";
import { cn } from "@/src/shared/lib/cn";
import {
  feedbackStatusTone,
  feedbackTopicTone,
} from "@/src/features/feedback/feedback-tone";
import type {
  FeedbackSort,
  FeedbackStatus,
  FeedbackTopic,
} from "@/src/shared/types/feedback";

const TOPIC_ORDER: FeedbackTopic[] = ["bug", "feature", "translation", "other"];
const TOPIC_LABEL_KEY: Record<FeedbackTopic, string> = {
  bug: "topicBug",
  feature: "topicFeature",
  translation: "topicTranslation",
  other: "topicOther",
};

const STATUS_ORDER: FeedbackStatus[] = [
  "new",
  "in_progress",
  "done",
  "declined",
];
// status labels live in the shared `status` ns (matches the StatusBadge labels).
const STATUS_LABEL_KEY: Record<FeedbackStatus, string> = {
  new: "feedbackNew",
  in_progress: "feedbackInProgress",
  done: "feedbackDone",
  declined: "feedbackDeclined",
};

const SORT_OPTIONS: { value: FeedbackSort; key: string }[] = [
  { value: "top", key: "sortTop" },
  { value: "new", key: "sortNewest" },
];

// Three chip shapes, each spelled out in full. Deliberately not routed through
// the shared FilterChipRow: that primitive gives every option in a row the same
// active tone, and here the status row is toned per-option (a selected
// "Declined" is red, a selected "Done" is green) with a colour dot to match.
const CHIP_BASE =
  "inline-flex items-center border transition-colors cursor-pointer";
const CHIP_IDLE =
  "border-white/[0.09] bg-white/[0.03] text-foreground-secondary hover:text-foreground";
const TOPIC_SHAPE =
  "h-[34px] gap-[7px] rounded-[10px] px-[13px] text-[13px] font-semibold";
const TOPIC_ACTIVE = "border-acc/40 bg-acc/[0.12] text-acc-hover";
const STATUS_SHAPE =
  "h-8 gap-[7px] rounded-pill px-3 text-[12.5px] font-semibold";
const STATUS_ANY_ACTIVE = "border-acc/40 bg-acc/[0.12] text-acc-hover";

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
    <div className="flex flex-col gap-[11px]">
      <SearchField
        surface="card"
        className="max-w-[380px]"
        aria-label={t("searchAria")}
        placeholder={t("searchPlaceholder")}
        value={searchInput}
        onChange={(event) => onSearchInputChange(event.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={topic === undefined}
          onClick={() => onTopicChange(undefined)}
          className={cn(
            CHIP_BASE,
            TOPIC_SHAPE,
            topic === undefined ? TOPIC_ACTIVE : CHIP_IDLE,
          )}
        >
          {t("filterAll")}
        </button>
        {TOPIC_ORDER.map((value) => {
          const { Icon } = feedbackTopicTone(value);
          const active = topic === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onTopicChange(value)}
              className={cn(
                CHIP_BASE,
                TOPIC_SHAPE,
                active ? TOPIC_ACTIVE : CHIP_IDLE,
              )}
            >
              <Icon aria-hidden size={13} strokeWidth={2} />
              {t(TOPIC_LABEL_KEY[value])}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={statusFilter === undefined}
          onClick={() => onStatusChange(undefined)}
          className={cn(
            CHIP_BASE,
            STATUS_SHAPE,
            statusFilter === undefined ? STATUS_ANY_ACTIVE : CHIP_IDLE,
          )}
        >
          {t("filterAll")}
        </button>
        {STATUS_ORDER.map((value) => {
          const { dot, activeChip } = feedbackStatusTone(value);
          const active = statusFilter === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onStatusChange(value)}
              className={cn(
                CHIP_BASE,
                STATUS_SHAPE,
                active ? activeChip : CHIP_IDLE,
              )}
            >
              <span
                aria-hidden
                className={cn("h-1.5 w-1.5 shrink-0 rounded-pill", dot)}
              />
              {tStatus(STATUS_LABEL_KEY[value])}
            </button>
          );
        })}

        {/* Sort is a segmented switch rather than a third chip row: it's an
            ordering, not a filter, so it must not read as "one more thing that
            narrows the list". Hand-rolled instead of SegmentedControl to keep
            the mock's 30px inner height and `aria-pressed` toggle semantics
            shared with the two rows above it. */}
        <div className="ms-auto inline-flex rounded-[11px] border border-white/[0.08] bg-surface-card p-[3px]">
          {SORT_OPTIONS.map((option) => {
            const active = sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onSortChange(option.value)}
                className={cn(
                  "h-[30px] cursor-pointer rounded-chip px-[13px] text-[12.5px] font-[650] transition-colors",
                  active
                    ? "bg-white/10 text-foreground"
                    : "bg-transparent text-white/50 hover:text-foreground-secondary",
                )}
              >
                {t(option.key)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
