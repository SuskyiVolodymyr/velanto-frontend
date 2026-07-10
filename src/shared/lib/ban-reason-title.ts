import type { RuleCategory } from "@/src/shared/types/rules";

/**
 * Resolves a ban `reason` id to a human-readable title, shared by every surface
 * that displays a ban reason (the banned-user notice, moderator ban history).
 *
 * Since ban reasons became rule-category ids (Rules-FE-2), a raw id like
 * `spam_manipulation` must never be shown to a human. Resolution rules:
 * - `'other'` → the caller-supplied localized "Other" label (kept as a param so
 *   this helper stays framework-agnostic and pulls in no i18n context).
 * - a category id → its `title` from the loaded rules.
 * - unknown / not-yet-loaded id → the raw id itself, so the UI never crashes and
 *   still renders *something* (it's only ever the subject's own reason, so no
 *   leak). Callers that fetch the rules async will re-render with the title once
 *   the categories arrive.
 * - empty / null / undefined → `null`, so callers can omit the row entirely.
 */
export function resolveBanReasonTitle(
  reason: string | null | undefined,
  categories: RuleCategory[],
  otherLabel: string,
): string | null {
  if (!reason) return null;
  if (reason === "other") return otherLabel;
  return categories.find((c) => c.id === reason)?.title ?? reason;
}
