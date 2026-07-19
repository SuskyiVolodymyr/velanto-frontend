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

// A manual slot pinning the given ordered item ids (one per place).
export function manualSlot(groupId: string, itemIds: string[]): Slot {
  return { groupId, mode: "manual", itemIds };
}

export function newRound(groupId: string): Round {
  return { id: crypto.randomUUID(), name: "", slots: [newSlot(groupId)] };
}

// Versus (nxn/1v1): a single 2-slot matchup round. Side A draws from `groupAId`,
// Side B from `groupBId` — which MAY be the same pool (a single-pool matchup).
// Both sides share the per-side draw count; 1v1 pins it to 1.
export function newVersusRound(
  groupAId: string,
  groupBId: string,
  perSideCount: number,
): Round {
  return {
    id: crypto.randomUUID(),
    name: "",
    slots: [
      { groupId: groupAId, mode: "random", count: perSideCount },
      { groupId: groupBId, mode: "random", count: perSideCount },
    ],
  };
}

// Seed a fresh versus pack: `roundCount` independent matchups, each defaulting
// to the same starting pair (the author then edits each round). Kept for the
// format switch; per-round editing happens via {@link newVersusRound}.
export function versusRounds(
  groupAId: string,
  groupBId: string,
  roundCount: number,
  perSideCount: number,
): Round[] {
  return Array.from({ length: roundCount }, () =>
    newVersusRound(groupAId, groupBId, perSideCount),
  );
}
