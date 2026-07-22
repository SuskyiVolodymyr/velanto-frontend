import type { Pack, PackFormat, UiPackFormat } from "@/src/shared/types/pack";

// Staff-facing English labels for the moderation/admin tables, which are not
// localized. (Player-facing surfaces use the `formats` i18n namespace instead.)
//
// UI-EXCLUDED:save_one_friends (velanto-frontend#368) — keyed by UiPackFormat,
// so it is deliberately absent: it must not appear as a filter OPTION. A queue
// ROW may still carry it, which is what `formatLabel`'s fallback is for. Never
// index this map directly with a `Pack["format"]`.
export const FORMAT_LABELS: Record<UiPackFormat, string> = {
  save_one: "Save One",
  sacrifice_one: "Sacrifice One",
  nxn: "NxN",
  rank_blind: "Rank Blind",
  "1v1": "1v1",
};

// A pack's `format` is the full PackFormat union, so it may name a format the UI
// has no label for. Fall back to the raw wire value rather than rendering an
// empty cell — a labelless format is a bug to notice, not to hide.
//
// `Object.hasOwn`, NOT `format in FORMAT_LABELS`: `in` walks the prototype
// chain, so a wire value of "constructor" or "toString" took the known-label
// branch and returned a FUNCTION typed as `string`.
export function formatLabel(format: PackFormat): string {
  return Object.hasOwn(FORMAT_LABELS, format)
    ? FORMAT_LABELS[format as UiPackFormat]
    : format;
}

export function getRoundsCount(pack: Pack): number {
  // Every format now stores its rounds uniformly as `rounds` (pools-and-rounds),
  // so the round count is simply that array's length. Guard against a missing
  // array so a malformed/partial pack can't crash a list card's render.
  return pack.rounds?.length ?? 0;
}
