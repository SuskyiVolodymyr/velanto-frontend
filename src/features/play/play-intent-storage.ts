/**
 * A one-shot signal a link sets just before navigating to a pack's play page,
 * telling `usePlayResume` which of the resume-choice modal's two actions to
 * take silently instead of asking — see PackPlayButton and
 * ContinuePlayingRail, the only two writers.
 *
 * Backed by `sessionStorage`, but consumed (read AND cleared) on the very
 * first read: a plain read would survive a page REFRESH of the destination
 * (sessionStorage's whole point is to survive one), which is exactly the case
 * that must still show the modal — the refresh never re-runs the link's click
 * handler, so once the one-shot value is gone, a refresh correctly finds
 * nothing and falls back to asking.
 */

export type PlayIntent = "continue" | "restart";

const KEY_PREFIX = "velanto:play-intent:";

/**
 * Set by a link's click handler immediately before navigating —
 * `PackPlayButton` writes "restart" (always start over, no prompt),
 * `ContinuePlayingRail` writes "continue" (always resume, no prompt).
 */
export function setPlayIntent(packId: string, intent: PlayIntent): void {
  try {
    sessionStorage.setItem(KEY_PREFIX + packId, intent);
  } catch {
    // Best-effort — worst case the destination just falls back to asking,
    // which is always safe.
  }
}

/**
 * Reads and clears the one-shot intent for `packId`, or null if none was set
 * — a typed/bookmarked URL, or a refresh (see this module's own doc).
 */
export function consumePlayIntent(packId: string): PlayIntent | null {
  const key = KEY_PREFIX + packId;
  try {
    const value = sessionStorage.getItem(key);
    if (value !== "continue" && value !== "restart") return null;
    sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}
