import type { Group, Round, Slot } from "@/src/shared/types/pack";

// Fresh, empty draft entries for the create form. Shared by the form's
// `defaultValues` and the editors' "add" actions so new entries always start in
// the same shape.
export function newGroup(): Group {
  return { id: crypto.randomUUID(), name: "", items: [] };
}

// A default elimination round: one random slot drawing the minimum meaningful
// count from the given group. RoundsEditor lets the author switch mode/count.
export function newSlot(groupId: string): Slot {
  return { groupId, mode: "random", count: 2 };
}

export function newRound(groupId: string): Round {
  return { id: crypto.randomUUID(), slots: [newSlot(groupId)] };
}

// Versus (nxn/1v1): expand a two-group pick + round count into that many
// 2-slot rounds over the same two groups. 1v1 pins the per-side count to 1.
export function versusRounds(
  groupAId: string,
  groupBId: string,
  roundCount: number,
  perSideCount: number,
): Round[] {
  return Array.from({ length: roundCount }, () => ({
    id: crypto.randomUUID(),
    slots: [
      { groupId: groupAId, mode: "random" as const, count: perSideCount },
      { groupId: groupBId, mode: "random" as const, count: perSideCount },
    ],
  }));
}
