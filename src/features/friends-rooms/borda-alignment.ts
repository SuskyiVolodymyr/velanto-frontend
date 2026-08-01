import type { BordaRoundResult } from "./room-types";

/**
 * How closely each player's own ranking matched the one the room ended up
 * with, as a 0–1 fraction.
 *
 * Computed from the ballots already on the wire — no server support needed —
 * as normalised Spearman footrule distance: sum the places each item moved
 * between a player's ballot and the group order, and divide by the worst that
 * sum could have been (a perfectly reversed ballot). 1 is identical, 0 is the
 * exact opposite.
 *
 * NOT a score, and deliberately not presented as one: shared-grid has no
 * winner. It answers "whose taste matched the room", which is the interesting
 * question when the result belongs to everybody.
 */
export function bordaAlignment(
  result: BordaRoundResult,
): Record<string, number> {
  // The group order, flattened out of its tiers. A tie shares one position, so
  // both members are compared against the same place — otherwise the order
  // items happen to sit in WITHIN a tier would show up as disagreement.
  const groupPlace = new Map<string, number>();
  let place = 0;
  for (const tier of result.order) {
    for (const itemId of tier) groupPlace.set(itemId, place);
    place += tier.length;
  }

  const n = groupPlace.size;
  // Worst-case footrule for n items: floor(n²/2). Under two items nothing can
  // disagree, so everyone is trivially aligned rather than dividing by zero.
  const worst = Math.floor((n * n) / 2);

  const alignment: Record<string, number> = {};
  for (const [userId, ballot] of Object.entries(result.ballots)) {
    if (worst === 0) {
      alignment[userId] = 1;
      continue;
    }
    let distance = 0;
    ballot.forEach((itemId, index) => {
      const theirs = groupPlace.get(itemId);
      // An item the group order doesn't contain can't be compared; skipping it
      // is the honest choice, and it should not happen in practice.
      if (theirs !== undefined) distance += Math.abs(index - theirs);
    });
    alignment[userId] = Math.max(0, 1 - distance / worst);
  }
  return alignment;
}
