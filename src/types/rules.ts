/**
 * Local, independent type definitions for the Community Rules + ban reasons.
 *
 * This repo does NOT import types from velanto-backend (separate repos, separate
 * type definitions — see .claude/docs/coding-conventions.md). The shapes here
 * mirror what the backend's `GET /rules` returns and its `BAN_REASONS` tuple,
 * but are redeclared on purpose so the two repos can evolve independently. A
 * later drift check (slice X1) keeps this list in sync with the backend.
 */

export interface RuleItem {
  number: number;
  text: string;
}

export interface RuleCategory {
  /** Stable category id — also a valid ban `reason` (minus `'other'`). */
  id: string;
  /** Human label, e.g. "Hate & Discrimination". */
  title: string;
  rules: RuleItem[];
}

export interface RulesDocument {
  version: number;
  categories: RuleCategory[];
}

/**
 * Valid ban `reason` values: the 12 stable rule-category ids plus the catch-all
 * `'other'`. Mirrors velanto-backend's `BAN_REASONS` (rules/types/rules.ts).
 * Uses the repo's `as const` + `typeof[number]` pattern (see pack.ts) so the
 * derived {@link BanReason} is a literal union, not `string`.
 */
export const BAN_REASONS = [
  "hate_discrimination",
  "harassment_bullying",
  "violence_harm",
  "sexual_content",
  "child_safety",
  "illegal_content",
  "privacy_doxxing",
  "impersonation_deception",
  "spam_manipulation",
  "misinformation",
  "intellectual_property",
  "platform_integrity",
  "other",
] as const;

export type BanReason = (typeof BAN_REASONS)[number];
