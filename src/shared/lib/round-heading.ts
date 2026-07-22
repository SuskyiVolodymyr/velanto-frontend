import type { Pack } from "@/src/shared/types/pack";

/**
 * The heading for a round, shared by the play and result screens so the two
 * can't drift — they did: the result screen hardcoded "Round N" while play
 * showed the author's round name or the pool name. Precedence:
 *
 *   1. the author-given round name, when set;
 *   2. "Round N" (1-indexed).
 *
 * The pool-name fallback for the elimination formats is gone (#355). A
 * random-pool round has no pool name to borrow at authoring time, so keeping it
 * would have named half a pack's rounds after their pool and numbered the rest,
 * which reads as a bug rather than a rule. Packs that leaned on it — a year per
 * round, say — now read "Round N" until those rounds are given names.
 *
 * `pack` stays in the signature: every caller has one, and passing it is what
 * lets a caller stay ignorant of where the name comes from.
 */
export function roundHeading(pack: Pack, roundIndex: number): string {
  const name = pack.rounds[roundIndex]?.name?.trim();
  return name ? name : `Round ${roundIndex + 1}`;
}
