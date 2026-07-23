import type { Pack, PackFormat } from "@/src/shared/types/pack";

// Staff-facing English labels for the moderation/admin tables, which are not
// localized. (Player-facing surfaces use the `formats` i18n namespace instead.)
//
// Keyed by the full PackFormat so every format — including save_one_friends,
// now a first-class creatable format — has a label; adding a future format
// won't compile until it is labelled here.
export const FORMAT_LABELS: Record<PackFormat, string> = {
  save_one: "Save One",
  sacrifice_one: "Sacrifice One",
  nxn: "NxN",
  rank_blind: "Rank Blind",
  "1v1": "1v1",
  save_one_friends: "Save One (Friends)",
};

// A pack's `format` arrives from the API as a raw string, so it could in
// principle name a format this build doesn't know yet (a backend deployed ahead
// of the frontend). Fall back to the raw wire value rather than rendering an
// empty cell — a labelless format is a bug to notice, not to hide.
//
// `Object.hasOwn`, NOT `format in FORMAT_LABELS`: `in` walks the prototype
// chain, so a wire value of "constructor" or "toString" took the known-label
// branch and returned a FUNCTION typed as `string`.
export function formatLabel(format: PackFormat): string {
  return Object.hasOwn(FORMAT_LABELS, format) ? FORMAT_LABELS[format] : format;
}

export function getRoundsCount(pack: Pack): number {
  // Every format now stores its rounds uniformly as `rounds` (pools-and-rounds),
  // so the round count is simply that array's length. Guard against a missing
  // array so a malformed/partial pack can't crash a list card's render.
  return pack.rounds?.length ?? 0;
}
