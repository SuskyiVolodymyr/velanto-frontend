import type {
  ReportStatus,
  ReportWithReporter,
} from "@/src/shared/types/report";

// Shared between the moderation panel's Reports tab (queue) and the report
// detail screen so both surfaces render report status/target consistently.
export const REPORT_STATUS_BADGE_CLASS: Record<ReportStatus, string> = {
  new: "border-acc/30 bg-acc/10 text-acc",
  reviewing:
    "border-status-pending/30 bg-status-pending/10 text-status-pending",
  closed: "border-white/10 bg-white/[0.06] text-foreground-secondary",
};

/**
 * How a report's target reads in the queue and on the detail screen.
 *
 * The backend names the target for us (`targetLabel` — a username, or a pack
 * title). It is null only when the target has since been deleted, and only
 * then do we fall back to the truncated id: "User 3f9a2b1c" is unusable for a
 * moderator deciding whether an account is worth acting on.
 */
export function reportTargetLabel(report: ReportWithReporter): {
  text: string;
  href: string;
} {
  const shortId = report.targetId.slice(0, 8);
  if (report.type === "user") {
    return {
      text: report.targetLabel ? `@${report.targetLabel}` : `User ${shortId}`,
      href: `/users/${report.targetId}`,
    };
  }
  const pack = report.targetLabel ?? `pack ${shortId}`;
  if (report.type === "round") {
    return {
      text: `Round ${(report.roundIndex ?? 0) + 1} of ${pack}`,
      href: `/packs/${report.targetId}`,
    };
  }
  return { text: pack, href: `/packs/${report.targetId}` };
}
