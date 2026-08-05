/**
 * Persists in-progress single-player plays so a pack can be resumed where the
 * player left off, and powers the dashboard's "Continue playing" rail.
 *
 * Backed by `localStorage` (NOT sessionStorage): resume must survive a full
 * reload and a new tab, which a session store wouldn't. And, deliberately,
 * there is NO in-memory fallback (unlike `last-play-storage.ts`): resume's whole
 * purpose is to outlive the page, which an in-memory map can't do — so when
 * localStorage is unavailable (private mode, blocked storage, quota) resume
 * silently disables rather than pretending to work for the current page only.
 *
 * Records are keyed per pack. On read they are invalidated two ways: a TTL
 * (stale plays are dropped) and a `packVersion` check (the pack was edited since
 * the save — see pack-structure-hash.ts). The number of uncompleted packs is
 * capped; a new one past the cap evicts the least-recently-played.
 */

/**
 * The bits of pack metadata the "Continue playing" rail needs to render a card,
 * snapshotted into the record so the rail works offline and without a per-card
 * fetch. Not part of the draw contract — refreshed on every save, and dropped
 * along with the record on a packVersion mismatch, so it never goes stale.
 */
export interface PlayResumePackSummary {
  title: string;
  coverTone: string;
  /**
   * The pack's custom cover, when it has one, so the rail can show the same
   * image the feed does instead of a bare tone swatch.
   *
   * Optional, and read defensively: records written before this field existed
   * are still valid and simply have no cover, and the key can 404 later anyway
   * (the object swept, the pack re-covered) — CoverImage handles that by
   * unmounting itself and letting `coverTone` show through.
   */
  coverImageKey?: string | null;
  totalRounds: number;
}

export interface PlayResumeRecord {
  packId: string;
  /** Seed for the deterministic draw — replays the exact same rounds/items. */
  seed: number;
  /** packStructureHash at save time; a mismatch on read drops the record. */
  packVersion: string;
  /** Rounds completed so far — where the resumed play picks up. */
  roundIndex: number;
  /**
   * Opaque per-screen progress (recorded picks / placements). The storage layer
   * never inspects it; each play screen owns its own serialisation.
   */
  choices: unknown;
  /** Display snapshot for the "Continue playing" rail (see above). */
  pack: PlayResumePackSummary;
  /** Epoch ms of the last save — drives both the TTL and LRU eviction. */
  updatedAt: number;
}

/** One week. A play older than this is treated as abandoned and dropped. */
export const RESUME_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Cap on simultaneously-resumable packs; a new one past this evicts the LRU. */
export const MAX_RESUME_RECORDS = 5;

const KEY_PREFIX = "velanto:play-resume:";

function storageKey(packId: string): string {
  return `${KEY_PREFIX}${packId}`;
}

function isExpired(record: PlayResumeRecord, now: number): boolean {
  return now - record.updatedAt > RESUME_TTL_MS;
}

function parse(raw: string | null): PlayResumeRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PlayResumeRecord;
    // Guard against a hand-edited or schema-drifted entry. `updatedAt` is
    // especially load-bearing: a non-numeric value would make `isExpired`
    // compute NaN (never pruned) and poison the freshest-first sort, so a record
    // missing any of the fields the storage layer itself relies on is dropped.
    // Only the resume-critical fields are validated here — a record with an
    // intact seed/choices must still resume even if its cosmetic `pack` display
    // snapshot is missing or malformed. The rail guards the snapshot itself.
    if (
      typeof value?.packId !== "string" ||
      typeof value.seed !== "number" ||
      typeof value.updatedAt !== "number" ||
      typeof value.packVersion !== "string" ||
      typeof value.roundIndex !== "number"
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/** Every stored resume record, freshest first, with expired ones pruned. */
function readAll(): PlayResumeRecord[] {
  let store: Storage;
  try {
    store = localStorage;
  } catch {
    return [];
  }
  const now = Date.now();
  const records: PlayResumeRecord[] = [];
  const staleKeys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;
    const record = parse(store.getItem(key));
    if (!record) {
      staleKeys.push(key);
      continue;
    }
    if (isExpired(record, now)) {
      staleKeys.push(key);
      continue;
    }
    records.push(record);
  }
  for (const key of staleKeys) {
    try {
      store.removeItem(key);
    } catch {
      // Best-effort prune; a failed removal just leaves a dead entry behind.
    }
  }
  return records.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * The saved play for `packId`, or null if there is none, it has expired, or the
 * pack was edited since (its `packVersion` no longer matches). Invalidated
 * records are deleted, so a stale pack drops out of the resume list on next open.
 */
export function readPlayResume(
  packId: string,
  packVersion: string,
): PlayResumeRecord | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(storageKey(packId));
  } catch {
    return null;
  }
  const record = parse(raw);
  if (!record) return null;
  if (isExpired(record, Date.now()) || record.packVersion !== packVersion) {
    deletePlayResume(packId);
    return null;
  }
  return record;
}

/**
 * Saves (or overwrites) the resume record for its pack. When this introduces a
 * NEW pack beyond `MAX_RESUME_RECORDS`, the least-recently-played existing packs
 * are evicted first so the cap holds.
 */
export function writePlayResume(record: PlayResumeRecord): void {
  let store: Storage;
  try {
    store = localStorage;
  } catch {
    return;
  }

  const existing = readAll();
  const isNewPack = !existing.some((r) => r.packId === record.packId);
  if (isNewPack && existing.length >= MAX_RESUME_RECORDS) {
    // existing is freshest-first; evict from the stale end until adding this one
    // lands us at the cap.
    const evictCount = existing.length - (MAX_RESUME_RECORDS - 1);
    for (const victim of existing.slice(existing.length - evictCount)) {
      deletePlayResume(victim.packId);
    }
  }

  try {
    store.setItem(storageKey(record.packId), JSON.stringify(record));
  } catch {
    // Storage full/blocked — resume just won't be available for this play.
  }
}

export function deletePlayResume(packId: string): void {
  try {
    localStorage.removeItem(storageKey(packId));
  } catch {
    // Nothing to do — a store we can't write is a store we can't clean.
  }
}

/** All resumable plays, freshest first — the data behind "Continue playing". */
export function listPlayResumes(): PlayResumeRecord[] {
  return readAll();
}
