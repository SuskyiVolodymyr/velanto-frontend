/**
 * Local, independent type definitions (this repo does not import types from
 * velanto-backend — see coding-conventions.md).
 */
export const PACK_FORMATS = [
  "save_one",
  "sacrifice_one",
  "nxn",
  "rank_blind",
  "1v1",
] as const;

export type PackFormat = (typeof PACK_FORMATS)[number];

// 'image' is intentionally omitted — no storage backend yet (backend issue #3).
export type ItemType = "text" | "youtube";

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  value: string;
}

// A group is a reusable POOL of items. Drawing is a per-round concern now (see
// Slot/Round below) — groups no longer carry selectionMode/sampleSize.
export interface Group {
  id: string;
  name: string;
  items: Item[];
}

// A round's slot draws from one group. `random` draws `count` items (re-sampled
// each play, never repeating across rounds sharing a group); `manual` shows the
// whole pool in order (count ignored). Mirrors velanto-backend types/round.ts.
export const SLOT_MODES = ["random", "manual"] as const;
export type SlotMode = (typeof SLOT_MODES)[number];

export interface Slot {
  groupId: string;
  mode: SlotMode;
  // random: how many items to draw. manual: unused.
  count?: number;
  // manual: the explicit, author-chosen ordered items to show. These are pinned
  // — reserved out of the pool so no random slot draws them. Mirrors backend
  // types/round.ts.
  itemIds?: string[];
}

export interface Round {
  id: string;
  // Optional author-given label (e.g. "Semifinals"). When blank/absent the UI
  // falls back to the round's group name (or "Round N"). Mirrors backend
  // types/round.ts.
  name?: string;
  slots: Slot[];
}

// Fixed taxonomy, not free text — see .claude/docs/domain-rules.md. Kept in
// sync with velanto-backend's PACK_TAGS (src/modules/packs/types/tags.ts) —
// this repo doesn't import backend types (see file header), so the list is
// duplicated deliberately and must be updated by hand alongside the backend.
export const PACK_TAGS = [
  "Anime",
  "Movies",
  "Music",
  "Sports",
  "Football",
  "Basketball",
  "Wrestling",
  "Food",
  "Gaming",
  "Board Games",
  "Comics",
  "Sci-Fi",
  "Fantasy",
  "Horror",
  "TV",
  "Cartoons",
  "Books",
  "Fashion",
  "Cars",
  "History",
  "Mythology",
  "Nature",
  "Animals",
  "Technology",
  "Science",
  "Space",
  "Art",
  "Travel",
  "Celebrities",
  "K-pop",
  "Memes",
] as const;

export type PackTag = (typeof PACK_TAGS)[number];

export const PACK_STATUSES = ["pending", "approved", "rejected"] as const;

export type PackStatus = (typeof PACK_STATUSES)[number];

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
  groups: Group[];
  rounds: Round[];
  authorId: string;
  createdAt: string;
  totalPlays: number;
  avgAgreementPercent: number;
  status: PackStatus;
  rejectionReason: string | null;
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
}
