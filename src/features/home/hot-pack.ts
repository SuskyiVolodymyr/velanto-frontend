import type { PackSummary } from "@/src/shared/types/pack";

/**
 * Play count at which a pack earns the "HOT" badge on its browse card.
 *
 * The 2.0.0 mock shows a HOT badge, and the owner chose to DERIVE it from real
 * play data rather than fabricate a signal — but the only per-card popularity
 * datum the feed carries today is lifetime `totalPlays`, so "hot" is a plain
 * absolute threshold on that. It's deliberately a documented placeholder: it is
 * NOT recency-weighted (a pack popular last year still reads HOT) and NOT
 * page-relative (so the same pack is HOT consistently wherever it appears). When
 * a real trending signal lands (D4, cross-repo), swap this for it and delete the
 * constant. Tune the number against the live catalogue's play distribution.
 */
export const HOT_PLAYS_THRESHOLD = 100;

/** Whether a pack should show the derived "HOT" badge — see the threshold doc. */
export function isHotPack(pack: PackSummary): boolean {
  return pack.totalPlays >= HOT_PLAYS_THRESHOLD;
}
