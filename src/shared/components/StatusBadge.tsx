import { Badge } from "@/src/shared/components/Badge";
import { cn } from "@/src/shared/lib/cn";
import { REPORT_STATUS_BADGE_CLASS } from "@/src/shared/lib/report-display";
import type { PackStatus } from "@/src/shared/types/pack";
import type { FeedbackStatus } from "@/src/shared/types/feedback";
import type { ReportStatus } from "@/src/shared/types/report";

interface StatusConfig {
  label: string;
  className: string;
}

const ACCENT = "border-acc/30 bg-acc/10 text-acc";
const WARNING = "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
const SUCCESS = "border-green-500/30 bg-green-500/10 text-green-400";
const DANGER = "border-red-500/30 bg-red-500/10 text-red-400";

const PACK_STATUS_CONFIG: Record<PackStatus, StatusConfig> = {
  pending: { label: "Pending review", className: WARNING },
  approved: { label: "Approved", className: SUCCESS },
  rejected: { label: "Rejected", className: DANGER },
};

const FEEDBACK_STATUS_CONFIG: Record<FeedbackStatus, StatusConfig> = {
  new: { label: "New", className: ACCENT },
  in_progress: { label: "In progress", className: WARNING },
  done: { label: "Done", className: SUCCESS },
  declined: { label: "Declined", className: DANGER },
};

// Labels only — the tone classes are reused from report-display.ts so the
// report queue/detail screens stay the single source of truth for report tones.
const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  closed: "Closed",
};

export type StatusBadgeProps =
  | { kind: "pack"; status: PackStatus; className?: string }
  | { kind: "feedback"; status: FeedbackStatus; className?: string }
  | { kind: "report"; status: ReportStatus; className?: string };

function resolveConfig(props: StatusBadgeProps): StatusConfig {
  switch (props.kind) {
    case "pack":
      return PACK_STATUS_CONFIG[props.status];
    case "feedback":
      return FEEDBACK_STATUS_CONFIG[props.status];
    case "report":
      return {
        label: REPORT_STATUS_LABELS[props.status],
        className: REPORT_STATUS_BADGE_CLASS[props.status],
      };
  }
}

// Maps a domain status value to a labeled, color-toned Badge. The status is
// conveyed as visible text (not colour alone), so it stays accessible to
// screen-reader and colour-blind users.
export function StatusBadge(props: StatusBadgeProps) {
  const { label, className: toneClass } = resolveConfig(props);
  return <Badge className={cn(toneClass, props.className)}>{label}</Badge>;
}
