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
      if (typeof pick !== "object" || pick === null) return null;
      const candidate = pick as RecordedPick;
      // itemId is optional now — versus picks record only a side's groupId.
      if (
        !Number.isInteger(candidate.roundIndex) ||
        candidate.roundIndex < 0 ||
        typeof candidate.groupId !== "string" ||
        (candidate.itemId !== undefined &&
          typeof candidate.itemId !== "string") ||
        (candidate.position !== undefined &&
          (!Number.isInteger(candidate.position) || candidate.position < 0))
      ) {
        return null;
      }
    }
    return parsed as RecordedPick[];
  } catch {
    return null;
  }
}

/**
 * Builds an absolute share URL from the current origin. Prefers a short
 * `?play=<id>` reference to the server-persisted play (constant length,
 * regardless of pack size); falls back to the legacy `?p=<encoded picks>` when
 * the play id isn't known yet (its record request hasn't resolved). Reads
 * `window.location.origin`, so this is client-only — it must not be called from
 * a Server Component.
 */
export function buildShareUrl(
  path: string,
  picks?: RecordedPick[] | null,
  playId?: string | null,
): string {
  const base = `${window.location.origin}${path}`;
  if (playId) return `${base}?play=${encodeURIComponent(playId)}`;
  return picks && picks.length > 0 ? `${base}?p=${encodePicks(picks)}` : base;
}
