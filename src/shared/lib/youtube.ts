const VIDEO_ID_RE = /(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/;

export function extractYouTubeId(url: string): string | null {
  const match = url.match(VIDEO_ID_RE);
  return match ? match[1] : null;
}

// YouTube's compound duration form: `1h2m3s`, or any subset (`2m30s`, `45s`).
// Anchored, and every unit optional — but the alternation below means "at least
// one" is still required, so a bare `abc` can't match with three empty groups.
const COMPOUND_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;

/**
 * Read the start offset, in whole seconds, out of a YouTube URL — the `t=` a
 * viewer gets from "Copy link at current time", or the `start=` an embed URL
 * carries instead.
 *
 * The value arrives in three shapes depending on where it was copied from:
 * bare seconds (`t=90`), seconds with a unit (`t=90s`, what YouTube's own share
 * dialog emits), and the compound form (`t=1h2m3s`). All three are accepted.
 *
 * Returns null — meaning "play from the beginning" — for anything else,
 * INCLUDING a malformed or non-positive value. That degradation matters: this
 * feeds `playerVars.start`, and handing the IFrame API a NaN or a negative
 * breaks the embed outright, so a typo'd timecode would cost the whole video
 * rather than just its offset. Zero is null rather than 0 for the same reason
 * it's harmless to: starting at 0 IS the default, so there's nothing to encode.
 */
export function extractYouTubeStart(url: string): number | null {
  let raw: string | null;
  try {
    const params = new URL(url).searchParams;
    // `t` wins over `start` when both are present: `t` is the one a human
    // pasted, `start` the one a share widget generated.
    raw = params.get("t") ?? params.get("start");
  } catch {
    return null; // not a parseable URL at all
  }
  if (!raw) return null;

  const compound = COMPOUND_RE.exec(raw);
  // A bare integer also matches COMPOUND_RE (all three groups undefined), which
  // would silently read as 0 — so handle the plain-digits case first.
  const seconds = /^\d+$/.test(raw)
    ? Number(raw)
    : compound
      ? Number(compound[1] ?? 0) * 3600 +
        Number(compound[2] ?? 0) * 60 +
        Number(compound[3] ?? 0)
      : NaN;

  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
