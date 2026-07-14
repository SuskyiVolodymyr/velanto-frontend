/**
 * Human labels and a colour for each audit-log `action` code. The colour groups
 * actions by what they DO, so a log page is scannable at a glance:
 *
 *   red    — punitive / destructive (ban, delete, reject)
 *   green  — restorative / approving (unban, approve, trust)
 *   violet — privilege changes (role changes)
 *   amber  — moderation triage (reports)
 *   cyan   — everything else (plain edits), and the fallback for an unknown code
 *
 * Presentation only: the backend records whatever action string the endpoint's
 * @AuditAction declares, so a code missing from this map still renders (as its
 * raw string, in the fallback colour) rather than vanishing from the log.
 *
 * Tailwind scans source for complete class names, so these must be written out
 * in full — a template like `bg-${hue}/15` would be purged from the CSS.
 */
interface AuditActionStyle {
  label: string;
  /** Full Tailwind classes for the row's action chip. */
  className: string;
}

const PUNITIVE = "bg-danger/15 text-danger";
const RESTORATIVE = "bg-success/15 text-success";
const PRIVILEGE = "bg-violet-400/15 text-violet-300";
const TRIAGE = "bg-amber-400/15 text-amber-300";
const NEUTRAL = "bg-acc/15 text-acc";

export const AUDIT_ACTIONS: Record<string, AuditActionStyle> = {
  ban_user: { label: "Ban user", className: PUNITIVE },
  delete_pack: { label: "Delete pack", className: PUNITIVE },
  reject_pack: { label: "Reject pack", className: PUNITIVE },

  unban_user: { label: "Unban user", className: RESTORATIVE },
  approve_pack: { label: "Approve pack", className: RESTORATIVE },
  set_trusted: { label: "Set trusted", className: RESTORATIVE },

  role_change: { label: "Change role", className: PRIVILEGE },

  review_report: { label: "Review report", className: TRIAGE },
  close_report: { label: "Close report", className: TRIAGE },

  update_pack: { label: "Update pack", className: NEUTRAL },
};

/** Label + colour for an action code, falling back gracefully for unknown ones. */
export function auditActionStyle(action: string): AuditActionStyle {
  return AUDIT_ACTIONS[action] ?? { label: action, className: NEUTRAL };
}
