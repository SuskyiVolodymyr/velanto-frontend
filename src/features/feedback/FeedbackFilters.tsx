import { useTranslations } from "next-intl";
import { Input } from "@/src/shared/components/Input";
import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import type {
  FeedbackSort,
  FeedbackStatus,
  FeedbackTopic,
} from "@/src/shared/types/feedback";

// "all" is the UI sentinel for "no filter" — same convention as
// AuthorPackList's StatusChoice (Profile/Preferences redesign, D13).
type TopicChoice = "all" | FeedbackTopic;
type StatusChoice = "all" | FeedbackStatus;

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

  const topicOptions: { value: TopicChoice; label: string }[] = [
    { value: "all", label: t("filterAll") },
    ...TOPIC_ORDER.map((value) => ({
      value,
      label: t(TOPIC_LABEL_KEY[value]),
    })),
  ];

  const statusOptions: { value: StatusChoice; label: string }[] = [
    { value: "all", label: t("filterAll") },
    ...STATUS_ORDER.map((value) => ({
      value,
      label: tStatus(STATUS_LABEL_KEY[value]),
    })),
  ];

  const sortOptions = SORT_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.key),
  }));

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

      <FilterChipRow<TopicChoice>
        options={topicOptions}
        value={topic ?? "all"}
        onSelect={(value) => onTopicChange(value === "all" ? undefined : value)}
      />

      <FilterChipRow<StatusChoice>
        options={statusOptions}
        value={statusFilter ?? "all"}
        onSelect={(value) =>
          onStatusChange(value === "all" ? undefined : value)
        }
      />

      <FilterChipRow<FeedbackSort>
        options={sortOptions}
        value={sort}
        onSelect={onSortChange}
      />
    </>
  );
}
