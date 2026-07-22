import type { PackLanguage } from "@/src/shared/types/pack-language";
/**
 * Local, independent type definitions (this repo does not import types from
 * velanto-backend — see coding-conventions.md).
 */
import type { Role } from "@/src/shared/types/user";

export const PACK_FORMATS = [
  "save_one",
  "sacrifice_one",
  "nxn",
  "rank_blind",
  "1v1",
] as const;

export type PackFormat = (typeof PACK_FORMATS)[number];

// 'image' items store the S3 media KEY (e.g. "media/item/<uuid>.webp") as their
// value; the render URL is built from it via shared/lib/media-url.
export type ItemType = "text" | "youtube" | "image";

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

// How a slot gets its POOL, as distinct from `mode` above, which is how it gets
// its ITEMS. `fixed` — the default when absent, so every stored pack keeps its
// meaning — names a pool via groupId, and may back any number of rounds:
// pinning consumes nothing. `random` leaves groupId out and is handed a pool at
// play time, one no other random slot took and no slot pins; randomness DOES
// consume, so a pack can only afford as many random slots as it has pools left
// after pinning. Mirrors velanto-backend types/round.ts.
export const GROUP_MODES = ["fixed", "random"] as const;
export type GroupMode = (typeof GROUP_MODES)[number];

export interface Slot {
  // Absent on a random-pool slot, which has no pool to name until play time.
  groupId?: string;
  groupMode?: GroupMode;
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

export const PACK_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
] as const;

export type PackStatus = (typeof PACK_STATUSES)[number];

export const COVER_TONES = [
  "#2b2a3a",
  "#20303a",
  "#33302a",
  "#35262c",
  "#22322c",
  "#312a24",
] as const;

// Lightweight author info the feed attaches to each pack (see backend
// PackQueryService.list) so discovery cards can show the creator without a
// per-card fetch. Absent on single-pack responses.
export interface PackAuthorSummary {
  id: string;
  username: string;
  avatarKey: string | null;
  role: Role;
  trusted: boolean;
}

export interface Pack {
  id: string;
  title: string;
  description: string;
  coverTone: string;
  // Optional custom cover: the S3 media KEY of an uploaded image (resolved to a
  // URL via shared/lib/media-url). When present it renders instead of the
  // `coverTone` gradient; null/absent falls back to the gradient. The backend
  // always sends `string | null`; kept optional here so the many inline Pack
  // fixtures that predate covers stay valid.
  coverImageKey?: string | null;
  format: PackFormat;
  /** The language the pack CONTENT is in — not the viewer's interface locale. */
  language: PackLanguage;
  tags: PackTag[];
  groups: Group[];
  rounds: Round[];
  authorId: string;
  author?: PackAuthorSummary;
  createdAt: string;
  // When the pack last entered the moderation queue — equal to createdAt until
  // an edit re-submits it, which is why the queue orders and labels rows by this
  // rather than by createdAt. Optional here only so the many Pack fixtures that
  // predate the column stay valid; the backend always sends it.
  submittedAt?: string;
  totalPlays: number;
  avgAgreementPercent: number;
  status: PackStatus;
  rejectionReason: string | null;
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
}
