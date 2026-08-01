import type { CSSProperties } from "react";
import { COVER_TONES } from "@/src/shared/types/pack";

/**
 * Derives a deterministic gradient tone from `COVER_TONES` for one media tile:
 * start at the index the pack's `coverTone` occupies in `COVER_TONES` (0 if
 * it isn't one of the six — a custom/unknown cover value shouldn't break the
 * derivation), then offset by `index` so consecutive tiles visibly differ
 * while staying inside the same six-tone family.
 *
 * Shared by CandidateCard (elimination formats), VersusRound/HeadToHeadRound
 * (nxn/1v1), and RankPlayScreen (rank_blind) — the four previously hand-rolled
 * an identical copy of this formula, each with its own guard-clause spelling
 * for "coverTone not found".
 *
 * Both `baseIndex` and the final tone index are clamped to >= 0: `baseIndex`
 * because `indexOf` returns -1 for an unknown tone, and the final index
 * because `index` itself can be negative (e.g. derived from a `findIndex`
 * that came up empty) — without the second clamp, a negative `index` could
 * still push `(baseIndex + index) % COVER_TONES.length` negative (JS's `%`
 * keeps the dividend's sign), indexing `COVER_TONES[-1]` -> `undefined`. For
 * every reachable non-negative `index` this is a no-op: the result is
 * already >= 0.
 */
export function toneFor(coverTone: string, index: number): string {
  const baseIndex = Math.max(
    0,
    (COVER_TONES as readonly string[]).indexOf(coverTone),
  );
  const toneIndex = Math.max(0, (baseIndex + index) % COVER_TONES.length);
  return COVER_TONES[toneIndex];
}

/**
 * Diagonal hairline texture over a text-item's gradient tile — purely
 * decorative, so every caller applies it via `aria-hidden`, not as part of
 * the accessible tree.
 */
export const HAIRLINE_OVERLAY_STYLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(122deg, rgba(255,255,255,.03) 0 1px, transparent 1px 15px)",
};
