import type { SlotMode } from "@/src/shared/types/pack";

// Frontend mirror of velanto-backend src/modules/packs/round-draw.ts. Given a
// pack's groups (pools) and rounds (ordered slots), resolves how many items each
// slot draws, keeping a per-group `used` counter so random draws never repeat
// across rounds sharing a group. Only the COUNT is deterministic here; which
// specific items get drawn is decided at play time (random). Reused by create
// feasibility warnings and the play-time draw engine so both agree with the API.

interface DrawGroupLike {
  id: string;
  items: readonly unknown[];
}

interface DrawSlotLike {
  groupId: string;
  mode: SlotMode;
  count?: number;
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
  const sizeById = new Map(
    groups.map((group) => [group.id, group.items.length]),
  );
  const usedByGroup = new Map<string, number>();

  return rounds.map((round) => ({
    slots: round.slots.map((slot) => {
      const size = sizeById.get(slot.groupId) ?? 0;

      // Manual slots show the whole pool and sit out the no-repeat bookkeeping.
      if (slot.mode === "manual") {
        return { groupId: slot.groupId, mode: slot.mode, drawnCount: size };
      }

      const used = usedByGroup.get(slot.groupId) ?? 0;
      const remaining = size - used;
      const drawnCount = Math.max(0, Math.min(slot.count ?? 0, remaining));
      usedByGroup.set(slot.groupId, used + drawnCount);
      return { groupId: slot.groupId, mode: slot.mode, drawnCount };
    }),
  }));
}
