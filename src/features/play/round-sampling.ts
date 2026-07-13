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
 * (and this repo's `resolveRoundDraws`, which resolves only the COUNTS): a
 * `random` slot shuffles the group's not-yet-used items and takes `count`,
 * marking them used so later rounds sharing the group never repeat; a `manual`
 * slot shows the whole pool in authored order and sits out the no-repeat
 * bookkeeping. Only the counts are deterministic — which specific items get
 * drawn is decided here, at play time, so this is re-run fresh per play.
 */
export function resolveRoundSelections(
  groups: readonly Group[],
  rounds: readonly Round[],
): SelectedRound[] {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const usedByGroup = new Map<string, Set<string>>();

  return rounds.map((round) => ({
    slots: round.slots.map((slot) => {
      const items = groupById.get(slot.groupId)?.items ?? [];

      // Manual slots show the whole pool and don't consume the used-set.
      if (slot.mode === "manual") {
        return { groupId: slot.groupId, mode: slot.mode, items: [...items] };
      }

      const used = usedByGroup.get(slot.groupId) ?? new Set<string>();
      const available = items.filter((item) => !used.has(item.id));
      const drawnCount = Math.max(
        0,
        Math.min(slot.count ?? 0, available.length),
      );
      const drawn = shuffle(available).slice(0, drawnCount);
      for (const item of drawn) used.add(item.id);
      usedByGroup.set(slot.groupId, used);
      return { groupId: slot.groupId, mode: slot.mode, items: drawn };
    }),
  }));
}
