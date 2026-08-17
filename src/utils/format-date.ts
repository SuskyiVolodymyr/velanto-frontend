/**
 * Platform-wide absolute date formatting, fixed to `dd-mm-yyyy` in every locale
 * (a deliberate house style, not locale-dependent — so a timestamp reads the
 * same everywhere). Built from the local-time parts rather than
 * `toLocaleDateString`, whose output varies by runtime locale.
 *
 * Relative timestamps ("2 days ago") are a separate concern — see
 * relative-time.ts. Use these only where an exact calendar date is shown.
 *
 * Both return "" for an unparseable/blank input rather than "Invalid Date", so a
 * missing timestamp renders as nothing instead of breaking the surrounding text.
 */
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `dd-mm-yyyy`, e.g. "18-07-2026". "" when `iso` can't be parsed. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/** `dd-mm-yyyy, HH:mm` (24-hour), e.g. "18-07-2026, 14:30". "" when unparseable. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${formatDate(iso)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
