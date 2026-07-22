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
  // rank_blind only: the 0-indexed order this item was SHOWN in its round.
  // Ranking blind means that order is what the player was reacting to, and
  // `position` can't carry it — picks are keyed by where an item ended up.
  // Absent on plays recorded before velanto-frontend#338.
  drawIndex?: number;
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

/**
 * One 1v1 pairing that has actually been played. Mirrors the backend's
 * MatchupResult (velanto-frontend#333).
 *
 * Keyed on the item pair with the two ids sorted, so the same two items meeting
 * with the sides swapped is one entry, not a mirrored duplicate — read `aWins`
 * as "itemA won", not "the left card won".
 */
export interface MatchupResult {
  itemAId: string;
  itemATitle: string;
  itemBId: string;
  itemBTitle: string;
  aWins: number;
  bWins: number;
  /**
   * Plays that saw this exact pairing. Usually small — a pack can produce far
   * more pairings than it has plays — so it must be shown next to the split,
   * which is otherwise read as a verdict rather than one person's opinion.
   */
  seen: number;
}

/** Pack-wide "top picked" entry: how often an item won the matchups it was in. */
export interface ItemTally {
  itemId: string;
  itemTitle: string;
  picked: number;
  appeared: number;
  /** Share of `appeared`, not of total plays. */
  percentage: number;
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
  /**
   * 1v1 only. Empty when every recorded play predates matchups carrying item
   * ids — those name only the winning pool, so their pairings are gone for
   * good.
   */
  matchups?: MatchupResult[];
  /** 1v1 only — the pack-wide "top picked" ranking, most-picked first. */
  topItems?: ItemTally[];
}

export interface RankResultItem {
  itemId: string;
  itemTitle: string;
  // How many recorded plays included this item in this round's ranking at
  // all — a round can sample fewer than all of a pool's items (random slot),
  // so an item may not appear in every play.
  timesRanked: number;
  // Mean 1-indexed placement across the plays that included this item
  // (1 = always placed first). Lower is better. 0 is the "never ranked"
  // sentinel (timesRanked === 0) — below any real rank, so filter
  // timesRanked > 0 before ranking items by averagePosition.
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

/**
 * One item's pack-wide podium record: how often it was placed first, second or
 * third across every recorded play. Mirrors the backend's PodiumTally.
 *
 * `total` is the three summed, and is what the table ranks on — a rank_blind
 * round is a whole ordering rather than a single pick, so an item reliably near
 * the top says more than one that wins occasionally.
 */
export interface PodiumTally {
  itemId: string;
  itemTitle: string;
  first: number;
  second: number;
  third: number;
  total: number;
}

export interface RankResults {
  packId: string;
  format: "rank_blind";
  totalPlays: number;
  rounds: RankRoundResult[];
  /**
   * Best-placed first; only items that reached the podium at least once.
   * Optional so a response from a backend older than velanto-frontend#338
   * still types — treat a missing value as an empty podium.
   */
  podium?: PodiumTally[];
}
