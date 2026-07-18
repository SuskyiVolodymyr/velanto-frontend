import type { Pack } from "@/src/shared/types/pack";

/**
 * The heading for a round, shared by the play and result screens so the two
 * can't drift — they did: the result screen hardcoded "Round N" while play
 * showed the author's round name or the pool name. Precedence:
 *
 *   1. the author-given round name, when set;
 *   2. for elimination formats (save_one / sacrifice_one / rank_blind), the
 *      round's pool name — a rank_blind round *is* its pool;
 *   3. "Round N" (1-indexed) — the last resort, and the norm for the versus
 *      formats (nxn / 1v1), whose rounds pair two pools and so have no single
 *      pool name to borrow.
 */
export function roundHeading(pack: Pack, roundIndex: number): string {
  const round = pack.rounds[roundIndex];
  const name = round?.name?.trim();
  if (name) return name;

  const isVersus = pack.format === "nxn" || pack.format === "1v1";
  if (!isVersus) {
    const groupId = round?.slots[0]?.groupId;
    const group = pack.groups.find((candidate) => candidate.id === groupId);
    if (group) return group.name;
  }

  return `Round ${roundIndex + 1}`;
}
