import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
import { REPORT_STATUS_BADGE_CLASS } from "@/src/shared/lib/report-display";
import type { PackStatus } from "@/src/shared/types/pack";
import type { FeedbackStatus } from "@/src/shared/types/feedback";
import type { ReportStatus } from "@/src/shared/types/report";

// Moderation-status tones use the dedicated --status-* family (a distinct amber
// from the game --score), so review states never read as game scoring.
const ACCENT = "border-acc/30 bg-acc/10 text-acc";
const WARNING =
  "border-status-pending/30 bg-status-pending/10 text-status-pending";
const SUCCESS =
  "border-status-approved/30 bg-status-approved/10 text-status-approved";
const DANGER =
  "border-status-rejected/30 bg-status-rejected/10 text-status-rejected";
const NEUTRAL = "border-white/15 bg-white/[0.06] text-foreground-secondary";

// Tone classes per status value; the human label comes from the `status` i18n
// namespace (keyed `<kind><StatusValue>`, e.g. `packPending`, `feedbackNew`).
const PACK_TONE: Record<PackStatus, string> = {
  draft: NEUTRAL,
  pending: WARNING,
  approved: SUCCESS,
  // The same amber as `pending`: both mean "not public yet, someone still has
  // work to do". What differs is WHO — the queue vs the author — and that is
  // what the label says, not the colour.
  changes_requested: WARNING,
  rejected: DANGER,
};
const FEEDBACK_TONE: Record<FeedbackStatus, string> = {
  new: ACCENT,
  in_progress: WARNING,
  done: SUCCESS,
  declined: DANGER,
};
const PACK_KEY: Record<PackStatus, string> = {
  draft: "packDraft",
  pending: "packPending",
  approved: "packApproved",
  changes_requested: "packChangesRequested",
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
  // Its own geometry — a bordered chip at 12px/500 — distinct from the pill
  // {@link Badge} (which is borderless 11px/700). They diverged in UI-kit v1.
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip border px-2.5 py-1 text-[12px] font-medium",
        resolveTone(props),
        props.className,
      )}
    >
      {t(resolveKey(props))}
    </span>
  );
}
