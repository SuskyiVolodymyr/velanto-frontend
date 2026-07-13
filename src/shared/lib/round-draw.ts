import type { SlotMode } from "@/src/shared/types/pack";

// Frontend mirror of velanto-backend src/modules/packs/round-draw.ts. Given a
// pack's groups (pools) and rounds (ordered slots), resolves how many items each
// slot draws. Two kinds of slot share the pool per group:
//   - `manual` pins an explicit set of items (`itemIds`), reserved globally so a
//     random slot never draws one, regardless of round order.
//   - `random` draws `count` from whatever's left after reservations and earlier
//     random draws in rounds sharing the group.
// Only the COUNT is deterministic here; which specific RANDOM items get drawn is
// decided at play time (see round-sampling.ts). Keep in lockstep with the API.

interface DrawGroupLike {
  id: string;
  items: readonly { id: string }[];
}

interface DrawSlotLike {
  groupId: string;
  mode: SlotMode;
  count?: number;
  itemIds?: readonly string[];
}

interface DrawRoundLike {
  slots: readonly DrawSlotLike[];
}

export interface ResolvedSlot {
  groupId: string;
  mode: SlotMode;
  drawnCount: number;
}

export interface ResolvedRound {
  slots: ResolvedSlot[];
}

export function resolveRoundDraws(
  groups: readonly DrawGroupLike[],
  rounds: readonly DrawRoundLike[],
): ResolvedRound[] {
  const itemIdsByGroup = new Map(
    groups.map((group) => [group.id, new Set(group.items.map((it) => it.id))]),
  );

  // Pass 1: reserve every manually-pinned item that exists in its group.
  const reservedByGroup = new Map<string, Set<string>>();
  for (const round of rounds) {
    for (const slot of round.slots) {
      if (slot.mode !== "manual" || !slot.itemIds) continue;
      const groupItems = itemIdsByGroup.get(slot.groupId);
      if (!groupItems) continue;
      const reserved = reservedByGroup.get(slot.groupId) ?? new Set<string>();
      for (const id of slot.itemIds) if (groupItems.has(id)) reserved.add(id);
      reservedByGroup.set(slot.groupId, reserved);
    }
  }

  // Pass 2: walk rounds in order.
  const randomUsedByGroup = new Map<string, number>();
  return rounds.map((round) => ({
    slots: round.slots.map((slot) => {
      const groupItems = itemIdsByGroup.get(slot.groupId) ?? new Set<string>();

      if (slot.mode === "manual") {
        const drawnCount = (slot.itemIds ?? []).filter((id) =>
          groupItems.has(id),
        ).length;
        return { groupId: slot.groupId, mode: slot.mode, drawnCount };
      }

      const reserved = reservedByGroup.get(slot.groupId)?.size ?? 0;
      const usedRandom = randomUsedByGroup.get(slot.groupId) ?? 0;
      const remaining = groupItems.size - reserved - usedRandom;
      const drawnCount = Math.max(0, Math.min(slot.count ?? 0, remaining));
      randomUsedByGroup.set(slot.groupId, usedRandom + drawnCount);
      return { groupId: slot.groupId, mode: slot.mode, drawnCount };
    }),
  }));
}
