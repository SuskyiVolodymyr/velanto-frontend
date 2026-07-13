import type { Group, Item, Round, SlotMode } from "@/src/shared/types/pack";

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface SelectedSlot {
  groupId: string;
  mode: SlotMode;
  items: Item[];
}

export interface SelectedRound {
  slots: SelectedSlot[];
}

/**
 * Client-side draw engine: walks a pack's rounds in order and SELECTS the items
 * each slot shows for this play. Mirrors velanto-backend's round-draw semantics
 * (and this repo's `resolveRoundDraws`, which resolves only the COUNTS):
 *   - a `manual` slot shows exactly its pinned `itemIds`, in the author's chosen
 *     order. Those items are reserved globally, so a random slot never draws one.
 *   - a `random` slot shuffles the group's items not reserved by any manual slot
 *     and not already used by an earlier random slot, and takes `count`.
 * Only the random draws are non-deterministic — re-run fresh per play.
 */
export function resolveRoundSelections(
  groups: readonly Group[],
  rounds: readonly Round[],
): SelectedRound[] {
  const groupById = new Map(groups.map((group) => [group.id, group]));

  // Reserve every manually-pinned item id (that exists in its group), globally.
  const reservedByGroup = new Map<string, Set<string>>();
  for (const round of rounds) {
    for (const slot of round.slots) {
      if (slot.mode !== "manual" || !slot.itemIds) continue;
      const group = groupById.get(slot.groupId);
      if (!group) continue;
      const groupItemIds = new Set(group.items.map((it) => it.id));
      const reserved = reservedByGroup.get(slot.groupId) ?? new Set<string>();
      for (const id of slot.itemIds) if (groupItemIds.has(id)) reserved.add(id);
      reservedByGroup.set(slot.groupId, reserved);
    }
  }

  const randomUsedByGroup = new Map<string, Set<string>>();
  return rounds.map((round) => ({
    slots: round.slots.map((slot) => {
      const group = groupById.get(slot.groupId);
      const items = group?.items ?? [];

      if (slot.mode === "manual") {
        // Pinned items, in the author's order (place 1, place 2, …).
        const byId = new Map(items.map((it) => [it.id, it]));
        const pinned = (slot.itemIds ?? [])
          .map((id) => byId.get(id))
          .filter((it): it is Item => it !== undefined);
        return { groupId: slot.groupId, mode: slot.mode, items: pinned };
      }

      const reserved = reservedByGroup.get(slot.groupId) ?? new Set<string>();
      const used = randomUsedByGroup.get(slot.groupId) ?? new Set<string>();
      const available = items.filter(
        (item) => !reserved.has(item.id) && !used.has(item.id),
      );
      const drawnCount = Math.max(
        0,
        Math.min(slot.count ?? 0, available.length),
      );
      const drawn = shuffle(available).slice(0, drawnCount);
      for (const item of drawn) used.add(item.id);
      randomUsedByGroup.set(slot.groupId, used);
      return { groupId: slot.groupId, mode: slot.mode, items: drawn };
    }),
  }));
}
