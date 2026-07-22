/**
 * Binary units, deliberately: every storage figure in this app is defined in
 * them. The base per-user budget is `250 * 1024 * 1024` and the global ceiling
 * `5 * 1024 * 1024 * 1024`, so decimal units would render the limits as
 * "262.1 MB" and "5.4 GB" — numbers no admin would recognise as the ones they
 * configured.
 */
const UNITS = ["B", "KB", "MB", "GB"] as const;
const STEP = 1024;

/**
 * A byte count as a short human string: `0 B`, `1.5 KB`, `250 MB`, `5 GB`.
 *
 * One decimal place, and only when it says something — `2 KB`, not `2.0 KB`,
 * because a trailing zero reads as precision that isn't there.
 *
 * Stops at GB rather than continuing to TB. The global ceiling is 5 GB, so a
 * four-digit GB figure means something has gone badly wrong, and it should look
 * wrong on the page instead of being tidied into "2 TB".
 *
 * A negative or non-finite input floors to `0 B`. The counters behind this
 * should never produce one, but rendering "NaN" or "-1 B" on a dashboard hides
 * the fault, where a zero invites the question.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  let value = bytes;
  let unit = 0;
  while (value >= STEP && unit < UNITS.length - 1) {
    value /= STEP;
    unit += 1;
  }

  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${UNITS[unit]}`;
}
