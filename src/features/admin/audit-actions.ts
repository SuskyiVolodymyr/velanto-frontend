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
  /**
   * next-intl key (in the `admin` namespace) for this action's human label. For
   * an unknown code the fallback carries the raw action string here instead, so
   * the caller must resolve it defensively (`t.has(labelKey) ? t(...) : ...`).
   */
  labelKey: string;
  /** Full Tailwind classes for the row's action chip. */
  className: string;
}

const PUNITIVE = "bg-danger/15 text-danger";
const RESTORATIVE = "bg-success/15 text-success";
const PRIVILEGE = "bg-violet-400/15 text-violet-300";
const TRIAGE = "bg-amber-400/15 text-amber-300";
const NEUTRAL = "bg-acc/15 text-acc";

export const AUDIT_ACTIONS: Record<string, AuditActionStyle> = {
  ban_user: { labelKey: "actionBanUser", className: PUNITIVE },
  delete_pack: { labelKey: "actionDeletePack", className: PUNITIVE },
  reject_pack: { labelKey: "actionRejectPack", className: PUNITIVE },

  unban_user: { labelKey: "actionUnbanUser", className: RESTORATIVE },
  approve_pack: { labelKey: "actionApprovePack", className: RESTORATIVE },
  set_trusted: { labelKey: "actionSetTrusted", className: RESTORATIVE },

  role_change: { labelKey: "actionChangeRole", className: PRIVILEGE },

  review_report: { labelKey: "actionReviewReport", className: TRIAGE },
  close_report: { labelKey: "actionCloseReport", className: TRIAGE },

  update_pack: { labelKey: "actionUpdatePack", className: NEUTRAL },
};

/** Label key + colour for an action code, falling back gracefully for unknown ones. */
export function auditActionStyle(action: string): AuditActionStyle {
  return AUDIT_ACTIONS[action] ?? { labelKey: action, className: NEUTRAL };
}
