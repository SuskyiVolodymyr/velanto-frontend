/**
 * Local, independent type definitions (this repo does not import types from
 * velanto-backend — see coding-conventions.md).
 */
export type PackFormat = "save_one" | "sacrifice_one" | "nxn" | "rank_blind" | "1v1";

// 'image' is intentionally omitted — no storage backend yet (backend issue #3).
export type ItemType = "text" | "youtube";

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  value: string;
}

export type SelectionMode = "random" | "manual";

export interface Group {
  id: string;
  name: string;
  selectionMode: SelectionMode;
  sampleSize?: number;
  items: Item[];
}

// nxn categories are flat item pools sampled at play time (no selectionMode/
// sampleSize — that's resolved per-round from the pack-level versusN).
export interface Category {
  id: string;
  name: string;
  items: Item[];
}

// Fixed taxonomy, not free text — see .claude/docs/domain-rules.md.
export const PACK_TAGS = [
  "Anime",
  "Movies",
  "Music",
  "Sports",
  "Football",
  "Food",
  "Gaming",
  "Comics",
  "Sci-Fi",
  "TV",
  "Books",
  "Fashion",
  "Cars",
  "History",
  "Nature",
  "Technology",
] as const;

export type PackTag = (typeof PACK_TAGS)[number];

export const COVER_TONES = [
  "#2b2a3a",
  "#20303a",
  "#33302a",
  "#35262c",
  "#22322c",
  "#312a24",
] as const;

export interface Pack {
  id: string;
  title: string;
  description: string;
  coverTone: string;
  format: PackFormat;
  tags: PackTag[];
  groups?: Group[];
  categories?: Category[];
  versusRounds?: number;
  versusN?: number;
  authorId: string;
  createdAt: string;
}
