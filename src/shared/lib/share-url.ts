import type { RecordedPick } from "@/src/shared/types/play-results";

/**
 * Encodes recorded picks into a URL-safe (base64url) string for the `?p=`
 * share param. Picks are ASCII-only (UUIDs + integers), so btoa is safe.
 */
export function encodePicks(picks: RecordedPick[]): string {
  const b64 = btoa(JSON.stringify(picks));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Reverses encodePicks. Opener-facing and fed an arbitrary query param, so it
 * must never throw: any malformed input (bad base64, bad JSON, wrong shape)
 * returns null and the caller falls back to own-picks/aggregate.
 */
export function decodePicks(code: string): RecordedPick[] | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const parsed: unknown = JSON.parse(atob(padded));
    if (!Array.isArray(parsed)) return null;
    for (const pick of parsed) {
      if (
        typeof pick !== "object" ||
        pick === null ||
        typeof (pick as RecordedPick).groupId !== "string" ||
        typeof (pick as RecordedPick).itemId !== "string" ||
        ((pick as RecordedPick).position !== undefined &&
          typeof (pick as RecordedPick).position !== "number")
      ) {
        return null;
      }
    }
    return parsed as RecordedPick[];
  } catch {
    return null;
  }
}

/** Builds an absolute share URL from the current origin, appending encoded picks when present. */
export function buildShareUrl(path: string, picks?: RecordedPick[] | null): string {
  const base = `${window.location.origin}${path}`;
  return picks && picks.length > 0 ? `${base}?p=${encodePicks(picks)}` : base;
}
