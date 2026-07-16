import type { RecordedPick } from "@/src/shared/types/play-results";

function lastPlayStorageKey(packId: string): string {
  return `velanto:last-play:${packId}`;
}

/**
 * In-memory fallback for when sessionStorage is unavailable — Safari private
 * mode, a blocked-storage context, or a quota error.
 *
 * This exists because these picks are load-bearing since #222: the result
 * screen is GATED on them, so failing to store them no longer costs a "your
 * pick" highlight, it costs the player the whole result screen right after
 * they finished the pack. Navigation from play to result is client-side, so
 * this module stays alive across it and the evidence survives. A full page
 * reload loses it, which is the honest limit of a client-side gate.
 */
const memoryFallback = new Map<string, RecordedPick[]>();

/**
 * Records that this browser just finished `packId`. Called as soon as the play
 * is complete — deliberately NOT waiting on the backend record request, since
 * the result screen gates on this and a slow or failed request would otherwise
 * lock out the player who just earned it.
 */
export function writeLastPlayPicks(
  packId: string,
  picks: RecordedPick[],
): void {
  memoryFallback.set(packId, picks);
  try {
    sessionStorage.setItem(lastPlayStorageKey(packId), JSON.stringify(picks));
  } catch {
    // Storage blocked or full — the in-memory copy above still carries this
    // session, so the gate opens for the player who just played.
  }
}

export function readLastPlayPicks(packId: string): RecordedPick[] | null {
  try {
    const raw = sessionStorage.getItem(lastPlayStorageKey(packId));
    if (raw) return JSON.parse(raw) as RecordedPick[];
  } catch {
    // fall through to the in-memory copy
  }
  return memoryFallback.get(packId) ?? null;
}
