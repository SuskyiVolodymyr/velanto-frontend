export interface RecordedPick {
  groupId: string;
  itemId: string;
  // rank_blind only: the 0-indexed slot this item was placed into within
  // its group's ranking. Absent for save_one/sacrifice_one/nxn picks.
  position?: number;
}

export interface RoundResultItem {
  itemId: string;
  itemTitle: string;
  count: number;
  percentage: number;
}

export interface RoundResult {
  groupId: string;
  groupName: string;
  items: RoundResultItem[];
}

export interface PackResults {
  packId: string;
  // Already sent by the backend for every non-rank_blind pack; typed now so
  // ResultScreen can discriminate between PackResults and RankResults.
  format: "save_one" | "sacrifice_one" | "nxn" | "1v1";
  totalPlays: number;
  rounds: RoundResult[];
}

export interface RankResultItem {
  itemId: string;
  itemTitle: string;
  // How many recorded plays included this item in this group's ranking at
  // all — a group's ranking can sample fewer than all of its items
  // (selectionMode: "random"), so an item may not appear in every play.
  timesRanked: number;
  // Mean 0-indexed placement across the plays that included this item.
  // Lower is better (0 = always placed first). 0 when timesRanked is 0.
  averagePosition: number;
  // Histogram of this item's placements: positionCounts[i] = how many
  // recorded plays placed this item at 0-indexed position i. Length equals
  // the group's slot count.
  positionCounts: number[];
}

export interface RankRoundResult {
  groupId: string;
  groupName: string;
  items: RankResultItem[];
}

export interface RankResults {
  packId: string;
  format: "rank_blind";
  totalPlays: number;
  rounds: RankRoundResult[];
}
