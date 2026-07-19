import { formatDate } from "@/src/shared/lib/format-date";
// Matches velanto-backend's isPermanentBan threshold (ban.ts): anything more
// than ~20 years out is treated as permanent for display purposes.
const PERMANENT_THRESHOLD_MS = 20 * 365 * 24 * 60 * 60 * 1000;

export function formatBanStatus(bannedUntil: string | null): string {
  if (!bannedUntil) return "Not banned";
  const remainingMs = new Date(bannedUntil).getTime() - Date.now();
  if (remainingMs <= 0) return "Not banned";
  if (remainingMs > PERMANENT_THRESHOLD_MS) return "Permanently banned";
  return `Banned until ${formatDate(bannedUntil)}`;
}

/** True when `bannedUntil` is currently in effect (present and in the future). */
export function isActiveBan(bannedUntil: string | null | undefined): boolean {
  return !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
}

/**
 * True when a ban is far enough out to read as "permanent" rather than a dated
 * expiry — same ~20-year threshold `formatBanStatus` uses, exposed so the
 * banned-user notice can mirror the distinction.
 */
export function isPermanentBan(bannedUntil: string): boolean {
  return new Date(bannedUntil).getTime() - Date.now() > PERMANENT_THRESHOLD_MS;
}
