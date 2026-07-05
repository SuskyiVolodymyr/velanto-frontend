export interface RecordedPick {
  groupId: string;
  itemId: string;
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
  totalPlays: number;
  rounds: RoundResult[];
}
