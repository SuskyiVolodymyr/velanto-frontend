import type { Group, Round } from "@/src/shared/types/pack";

/**
 * A content fingerprint of the part of a pack that determines a play: its pools'
 * items and its rounds' slots. Used to invalidate a saved resume record when the
 * author has edited the pack since it was saved — a stored seed only replays the
 * SAME play against the SAME structure, so on a mismatch the record is dropped
 * and the pack reopens as a fresh play (owner's chosen behaviour).
 *
 * Why hash the structure instead of reading a pack version field: `Pack` has no
 * version/updatedAt that reliably moves on every edit — `submittedAt` only bumps
 * when an edit re-enters moderation, which a trusted/staff author's edit skips.
 * The structure itself is the honest signal.
 *
 * What's included: each pool's id and every item's id/type/title/value (the
 * draw picks by id, and the player SEES title/value, so a content edit must
 * invalidate), and each round's id and full slot shape (groupId, groupMode,
 * mode, count, itemIds — the exact inputs to the draw). What's excluded:
 * cosmetic labels (pool name, round name) that change neither the draw nor the
 * cards, so a relabel doesn't needlessly discard an in-progress play.
 */
export function packStructureHash(pack: {
  groups?: Group[];
  rounds?: Round[];
}): string {
  // A fixed-field projection so the serialisation is stable regardless of the
  // source objects' key order. Arrays preserve order, which matters: draw order
  // depends on item order within a pool and on round/slot order.
  const projection = {
    g: (pack.groups ?? []).map((group) => [
      group.id,
      group.items.map((item) => [item.id, item.type, item.title, item.value]),
    ]),
    r: (pack.rounds ?? []).map((round) => [
      round.id,
      round.slots.map((slot) => [
        slot.groupId ?? null,
        slot.groupMode ?? null,
        slot.mode,
        slot.count ?? null,
        slot.itemIds ?? null,
      ]),
    ]),
  };
  return fnv1a(JSON.stringify(projection));
}

/**
 * FNV-1a 32-bit hash → base36. Not cryptographic — it only needs to change when
 * the input changes; collisions between two DIFFERENT structures are astronomically
 * unlikely at this scale and would at worst let one stale resume through.
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
