import type { Group, Round } from "@/src/shared/types/pack";

/**
 * The `<Select>` value that means "don't name a pool — draw one at play time".
 *
 * A sentinel rather than the empty string, which already means "nothing chosen
 * yet" on a fresh slot and would make the two indistinguishable.
 */
export const RANDOM_POOL_VALUE = "__random__";

/**
 * How many pools are still available to a random slot: every pool, minus the
 * ones some slot pins, minus every OTHER random slot already declared —
 * including the other side of the same round.
 *
 * Shown in the option's own label so the author meets the capacity rule as a
 * number that counts down rather than as an error at submit. On a two-slot
 * round of a 26-pool pack with nothing else declared, side A reads 26 and side
 * B reads 25.
 *
 * Can go negative if a pack is edited into an over-committed state; callers
 * clamp for display, and `create-pack.refinements.ts` is what actually blocks
 * the save.
 */
export function availablePoolCount(
  groups: readonly Group[],
  rounds: readonly Round[],
  self: { roundIndex: number; slotIndex: number },
): number {
  const pinned = new Set<string>();
  let otherRandom = 0;
  rounds.forEach((round, ri) => {
    round.slots.forEach((slot, si) => {
      if (ri === self.roundIndex && si === self.slotIndex) return;
      if (slot.groupMode === "random") otherRandom += 1;
      else if (slot.groupId) pinned.add(slot.groupId);
    });
  });
  return groups.length - pinned.size - otherRandom;
}
