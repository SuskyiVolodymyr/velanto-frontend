import type { PackLanguage } from "@/shared/types/pack-language";
/**
 * Local, independent type definitions (this repo does not import types from
 * velanto-backend — see coding-conventions.md).
 */
import type { Role } from "@/shared/types/user";

export const PACK_FORMATS = [
  "save_one",
  "sacrifice_one",
  "nxn",
  "rank_blind",
  "1v1",
] as const;

export type PackFormat = (typeof PACK_FORMATS)[number];

// 'image' items store the S3 media KEY (e.g. "media/item/<uuid>.webp") as their
// value; the render URL is built from it via shared/utils/media-url.
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
  // Sent back to the author with a list of marked items and a message, rather
  // than turned away: the pack leaves the moderation queue but stays editable
  // and keeps its `changeRequest`, and re-submitting returns it to "pending".
  // Distinct from "rejected", which is a refusal carrying only a reason.
  "changes_requested",
  "rejected",
] as const;

export type PackStatus = (typeof PACK_STATUSES)[number];

/** What part of a pack a moderator's change request points at. */
export const CHANGE_REQUEST_MARK_KINDS = [
  "title",
  "description",
  "cover",
  "tags",
  "item",
  "round",
] as const;

export type ChangeRequestMarkKind = (typeof CHANGE_REQUEST_MARK_KINDS)[number];

export interface ChangeRequestMark {
  kind: ChangeRequestMarkKind;
  /** Item or round id; "" for the single-valued pack fields (title, cover, …). */
  id: string;
  /**
   * What the marked thing was called when the request was written. Stored
   * rather than resolved on read: the author is about to change exactly these
   * things, and a request that renamed itself as they edited would stop
   * matching what the moderator saw.
   */
  label: string;
  /** What the author has to do about it. */
  request: string;
}

/** A moderator's outstanding "request changes" outcome for one pack. */
export interface PackChangeRequest {
  message: string;
  marks: ChangeRequestMark[];
  requestedById: string;
  /** ISO-8601. */
  requestedAt: string;
}

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
  // URL via shared/utils/media-url). When present it renders instead of the
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
  // When the pack FIRST went public, or null if it never has (a draft, or a
  // legacy pack from before the backend column existed). This is the honest
  // "published" date — createdAt is only the fallback, since a pack can sit as a
  // draft or wait in moderation before going live. Optional here only so Pack
  // fixtures that predate it stay valid; the backend always sends it.
  firstPublishedAt?: string | null;
  /**
   * The moderator's outstanding change request, or null. Only ever non-null
   * while `status` is "changes_requested" — approve, reject and the author's
   * re-submission all clear it — and only the author and moderators can fetch
   * a pack in that state at all. Optional here only so the many Pack fixtures
   * that predate it stay valid; the backend always sends it on a single pack
   * (never on a list summary).
   */
  changeRequest?: PackChangeRequest | null;
  totalPlays: number;
  avgAgreementPercent: number;
  status: PackStatus;
  rejectionReason: string | null;
  // No `score`. The API used to send likes − dislikes on every voted entity;
  // only the feedback board's rank badge ever drew one, and it keeps its own.
  // Pack UI renders the two counts (see VoteControl).
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
}

/**
 * One round as the pack PAGE draws it — a chip, not a round.
 *
 * `itemsCount` is resolved by the API's draw engine, not derivable here: a
 * random slot's size depends on what manual slots reserved out of the shared
 * pool, which needs every pool's item ids — the very thing `PackOverview`
 * exists to avoid downloading.
 */
export interface PackRoundSummary {
  /** The author's round label, or null when they left it blank. */
  name: string | null;
  /**
   * The pool the round draws from, when it draws from exactly one NAMED pool.
   * Null for a multi-slot (versus) round and for a random-pool slot — both fall
   * back to a translated label here.
   */
  poolName: string | null;
  /**
   * True when the round is a single slot whose pool is picked at play time.
   * Labelled "Random pool" — without this it would be indistinguishable from a
   * versus round, which labels itself "Round N".
   */
  randomPool: boolean;
  itemsCount: number;
  id: string;
}

/**
 * `GET /packs/{id}/overview` — what the public pack PAGE renders.
 *
 * A full {@link Pack} minus `groups` (every pool, round and item, ~95% of the
 * response and nothing this page draws), with `rounds` collapsed to
 * {@link PackRoundSummary} chips.
 *
 * Only this page and its OG image use it. Play, edit, the results screens and
 * the moderation review screen all still fetch the full pack — they need the
 * items. Reach for `Pack | PackOverview` on a component both sides render.
 */
export interface PackOverview extends Omit<Pack, "groups" | "rounds"> {
  rounds: PackRoundSummary[];
}

/**
 * The list/feed shape: exactly what a card renders, and nothing else.
 *
 * Two groups of fields are absent, for different reasons.
 *
 * `groups`/`rounds` are a pack's entire content — every pool, round and item —
 * which is ~95% of a pack's payload and unused by any list view.
 *
 * `language`, `avgAgreementPercent`, `rejectionReason` and the four vote fields
 * (`likes`/`dislikes`/`myVote`) were removed once it turned out no card
 * read them: every consumer of all seven works from a single pack instead. On
 * the backend they were not free — populating the vote figures cost a grouped
 * count on every list request plus a per-viewer lookup for every signed-in
 * caller.
 *
 * The 2.0.0 mock does put a like count on the browse card (the heart badge on
 * the cover), and it is simply not built yet. When it is, add `likes` back here
 * and to the backend's `PublicPackSummary` — deliberately just that one field,
 * not the whole aggregate.
 *
 * Derived by subtraction rather than written out, so a new field on {@link Pack}
 * lands here too and has to be excluded on purpose.
 */
export type PackSummary = Omit<
  Pack,
  | "groups"
  | "rounds"
  | "language"
  | "avgAgreementPercent"
  | "rejectionReason"
  | "likes"
  | "dislikes"
  | "myVote"
>;

/**
 * A played pack as `/users/:id/recently-played` returns it: the same card
 * summary the browse grid renders, plus when THIS user last played it.
 *
 * The timestamp can't be derived client-side — `createdAt`/`firstPublishedAt`
 * are facts about the pack's own life, not about the viewer — so it rides on
 * the row. Mirrors `RecentlyPlayedPack` in the backend's
 * `recently-played.service.ts`.
 */
export type RecentlyPlayedPack = PackSummary & {
  /** ISO timestamp of this user's most recent play of this pack. */
  lastPlayedAt: string;
};
