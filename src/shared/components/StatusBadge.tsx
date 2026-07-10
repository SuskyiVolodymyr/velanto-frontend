import { useTranslations } from "next-intl";
import { Badge } from "@/src/shared/components/Badge";
import { cn } from "@/src/shared/lib/cn";
import { REPORT_STATUS_BADGE_CLASS } from "@/src/shared/lib/report-display";
import type { PackStatus } from "@/src/shared/types/pack";
import type { FeedbackStatus } from "@/src/shared/types/feedback";
import type { ReportStatus } from "@/src/shared/types/report";

const ACCENT = "border-acc/30 bg-acc/10 text-acc";
const WARNING = "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
const SUCCESS = "border-green-500/30 bg-green-500/10 text-green-400";
const DANGER = "border-red-500/30 bg-red-500/10 text-red-400";

// Tone classes per status value; the human label comes from the `status` i18n
// namespace (keyed `<kind><StatusValue>`, e.g. `packPending`, `feedbackNew`).
const PACK_TONE: Record<PackStatus, string> = {
  pending: WARNING,
  approved: SUCCESS,
  rejected: DANGER,
};
const FEEDBACK_TONE: Record<FeedbackStatus, string> = {
  new: ACCENT,
  in_progress: WARNING,
  done: SUCCESS,
  declined: DANGER,
};
const PACK_KEY: Record<PackStatus, string> = {
  pending: "packPending",
  approved: "packApproved",
  rejected: "packRejected",
};
const FEEDBACK_KEY: Record<FeedbackStatus, string> = {
  new: "feedbackNew",
  in_progress: "feedbackInProgress",
  done: "feedbackDone",
  declined: "feedbackDeclined",
};
const REPORT_KEY: Record<ReportStatus, string> = {
  new: "reportNew",
  reviewing: "reportReviewing",
  closed: "reportClosed",
};

export type StatusBadgeProps =
  | { kind: "pack"; status: PackStatus; className?: string }
  | { kind: "feedback"; status: FeedbackStatus; className?: string }
  | { kind: "report"; status: ReportStatus; className?: string };

function resolveTone(props: StatusBadgeProps): string {
  switch (props.kind) {
    case "pack":
      return PACK_TONE[props.status];
    case "feedback":
      return FEEDBACK_TONE[props.status];
    case "report":
      return REPORT_STATUS_BADGE_CLASS[props.status];
  }
}

function resolveKey(props: StatusBadgeProps): string {
  switch (props.kind) {
    case "pack":
      return PACK_KEY[props.status];
    case "feedback":
      return FEEDBACK_KEY[props.status];
    case "report":
      return REPORT_KEY[props.status];
  }
}

// Maps a domain status value to a labeled, color-toned Badge. The status is
// conveyed as visible text (not colour alone), so it stays accessible to
// screen-reader and colour-blind users.
export function StatusBadge(props: StatusBadgeProps) {
  const t = useTranslations("status");
  return (
    <Badge className={cn(resolveTone(props), props.className)}>
      {t(resolveKey(props))}
    </Badge>
  );
}
