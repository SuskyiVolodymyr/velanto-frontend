import type { RecordedPick } from "@/src/shared/types/play-results";

function lastPlayStorageKey(packId: string): string {
  return `velanto:last-play:${packId}`;
}

/** Written only once a play is confirmed recorded server-side (see PlayScreen). */
export function writeLastPlayPicks(
  packId: string,
  picks: RecordedPick[],
): void {
  sessionStorage.setItem(lastPlayStorageKey(packId), JSON.stringify(picks));
}

export function readLastPlayPicks(packId: string): RecordedPick[] | null {
  try {
    const raw = sessionStorage.getItem(lastPlayStorageKey(packId));
    if (!raw) return null;
    return JSON.parse(raw) as RecordedPick[];
  } catch {
    return null;
  }
}
