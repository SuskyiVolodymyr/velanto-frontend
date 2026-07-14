/**
 * Human labels for the audit-log `action` codes, and the Logs tab's action
 * filter options (the dropdown is built from these keys).
 *
 * Presentation only — the backend records whatever action string the endpoint's
 * @AuditAction declares, so an action missing from this map still renders (as
 * its raw code) rather than disappearing from the log.
 */
export const ACTION_LABELS: Record<string, string> = {
  ban_user: "Ban user",
  unban_user: "Unban user",
  role_change: "Change role",
  set_trusted: "Set trusted",
  delete_pack: "Delete pack",
  update_pack: "Update pack",
  approve_pack: "Approve pack",
  reject_pack: "Reject pack",
  review_report: "Review report",
  close_report: "Close report",
};
