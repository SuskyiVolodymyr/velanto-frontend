import type { Pack } from "@/src/shared/types/pack";

export const FORMAT_LABELS: Record<Pack["format"], string> = {
  save_one: "Save One",
  sacrifice_one: "Sacrifice One",
  nxn: "NxN",
  rank_blind: "Rank Blind",
  "1v1": "1v1",
};

export function getRoundsCount(pack: Pack): number {
  // Every format now stores its rounds uniformly as `rounds` (pools-and-rounds),
  // so the round count is simply that array's length.
  return pack.rounds.length;
}
