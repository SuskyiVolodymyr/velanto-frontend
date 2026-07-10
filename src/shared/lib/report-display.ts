import type {
  ReportStatus,
  ReportWithReporter,
} from "@/src/shared/types/report";

// Shared between SupportScreen (queue) and SupportReportScreen (detail) so
// both surfaces render report status/target consistently.
export const REPORT_STATUS_BADGE_CLASS: Record<ReportStatus, string> = {
  new: "border-acc/30 bg-acc/10 text-acc",
  reviewing: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  closed: "border-white/10 bg-white/[0.06] text-foreground-secondary",
};

export function reportTargetLabel(report: ReportWithReporter): {
  text: string;
  href: string;
} {
  const shortId = report.targetId.slice(0, 8);
  if (report.type === "user")
    return { text: `User ${shortId}`, href: `/users/${report.targetId}` };
  if (report.type === "round") {
    return {
      text: `Round ${(report.roundIndex ?? 0) + 1} of pack ${shortId}`,
      href: `/packs/${report.targetId}`,
    };
  }
  return { text: `Pack ${shortId}`, href: `/packs/${report.targetId}` };
}
