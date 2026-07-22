import type { Pack, PackFormat, UiPackFormat } from "@/src/shared/types/pack";

// Keyed by UiPackFormat, not PackFormat: `save_one_friends` is deliberately
// absent because it has no label to give yet (velanto-backend#258 mirrors it as
// a wire-contract constant only). It gains its entry in the dedicated frontend
// PR that adds the creator and play path. Look labels up via `formatLabel`.
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
export function formatLabel(format: PackFormat): string {
  return format in FORMAT_LABELS
    ? FORMAT_LABELS[format as UiPackFormat]
    : format;
}

export function getRoundsCount(pack: Pack): number {
  // Every format now stores its rounds uniformly as `rounds` (pools-and-rounds),
  // so the round count is simply that array's length. Guard against a missing
  // array so a malformed/partial pack can't crash a list card's render.
  return pack.rounds?.length ?? 0;
}
