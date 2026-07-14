const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  if (diffMs < MINUTE_MS) return "just now";
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  return `${Math.floor(diffMs / DAY_MS)}d ago`;
}

/**
 * How long ago `iso` was, as a negative `Intl.RelativeTimeFormat` value/unit
 * pair. Deliberately capped at days — it never escalates to weeks/months/years,
 * so an old pack reads "120 days ago" rather than "4 months ago".
 */
export function relativeTimeParts(
  iso: string,
  now: Date = new Date(),
): { value: number; unit: Intl.RelativeTimeFormatUnit } {
  const diffMs = now.getTime() - new Date(iso).getTime();
  if (diffMs < MINUTE_MS) return { value: 0, unit: "second" };
  if (diffMs < HOUR_MS)
    return { value: -Math.floor(diffMs / MINUTE_MS), unit: "minute" };
  if (diffMs < DAY_MS)
    return { value: -Math.floor(diffMs / HOUR_MS), unit: "hour" };
  return { value: -Math.floor(diffMs / DAY_MS), unit: "day" };
}

// Intl.RelativeTimeFormat construction is comparatively expensive and the feed
// renders one per card, so reuse a formatter per locale.
const formatters = new Map<string, Intl.RelativeTimeFormat>();

/**
 * Localized, day-capped "… ago" label (e.g. "2 minutes ago", "120 days ago";
 * `numeric: "auto"` renders the sub-minute case as "now", and prefers a
 * locale's idiomatic word where it has one). Prefer this over
 * {@link formatRelativeTime}, whose English strings are baked in.
 *
 * Returns null for an unparseable timestamp rather than throwing — callers
 * render nothing in that case. `Intl.RelativeTimeFormat.format` throws a
 * RangeError on NaN, so an absent/blank `createdAt` would otherwise take down
 * the whole card that renders it.
 */
export function formatRelativeTimeIntl(
  iso: string,
  locale: string,
  now: Date = new Date(),
): string | null {
  if (Number.isNaN(new Date(iso).getTime())) return null;
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    formatters.set(locale, formatter);
  }
  const { value, unit } = relativeTimeParts(iso, now);
  return formatter.format(value, unit);
}
