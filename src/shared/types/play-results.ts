import type { PackFormat } from "@/src/shared/types/pack";

export interface RecordedPick {
  // Which round of the pack this pick belongs to (0-indexed). Rounds — not
  // groups — are the unit of aggregation now, since several rounds can draw
  // from the same pool (group), so groupId alone no longer identifies a round.
  roundIndex: number;
  // The pool the pick came from. For a TWO-POOL versus round this is the chosen
  // SIDE's group id (no itemId — you pick a side). For a SINGLE-POOL versus
  // round it is the shared pool, with one pick per drawn item (see `chosen`).
  groupId: string;
  // save_one/sacrifice_one/rank_blind, and single-pool versus: the specific
  // item chosen/placed/drawn.
  itemId?: string;
  // rank_blind only: the 0-indexed slot this item was placed into within the
  // round's ranking. Absent for the other formats.
  position?: number;
  // Single-pool versus only: whether this drawn item was on the chosen side.
  chosen?: boolean;
}

export interface RoundResultItem {
  // For versus formats this is the SIDE's group id; otherwise an item id.
  itemId: string;
  itemTitle: string;
  count: number;
  percentage: number;
}

export interface RoundResult {
  roundIndex: number;
  items: RoundResultItem[];
}

export interface PackResults {
  packId: string;
  // Already sent by the backend for every non-rank_blind pack; typed now so
  // ResultScreen can discriminate between PackResults and RankResults. Derived
  // from PackFormat (minus "rank_blind", which RankResults carries) so the
  // format literals stay deduped against the canonical PACK_FORMATS list.
  format: Exclude<PackFormat, "rank_blind">;
  totalPlays: number;
  rounds: RoundResult[];
}

export interface RankResultItem {
  itemId: string;
  itemTitle: string;
  // How many recorded plays included this item in this round's ranking at
  // all — a round can sample fewer than all of a pool's items (random slot),
  // so an item may not appear in every play.
  timesRanked: number;
  // Mean 0-indexed placement across the plays that included this item.
  // Lower is better (0 = always placed first). 0 when timesRanked is 0.
  averagePosition: number;
  // Histogram of this item's placements: positionCounts[i] = how many
  // recorded plays placed this item at 0-indexed position i. Length equals
  // the round's slot count.
  positionCounts: number[];
}

export interface RankRoundResult {
  roundIndex: number;
  items: RankResultItem[];
}

export interface RankResults {
  packId: string;
  format: "rank_blind";
  totalPlays: number;
  rounds: RankRoundResult[];
}
