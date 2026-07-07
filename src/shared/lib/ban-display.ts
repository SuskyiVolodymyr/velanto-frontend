// Matches velanto-backend's isPermanentBan threshold (ban.ts): anything more
// than ~20 years out is treated as permanent for display purposes.
const PERMANENT_THRESHOLD_MS = 20 * 365 * 24 * 60 * 60 * 1000;

export function formatBanStatus(bannedUntil: string | null): string {
  if (!bannedUntil) return "Not banned";
  const remainingMs = new Date(bannedUntil).getTime() - Date.now();
  if (remainingMs <= 0) return "Not banned";
  if (remainingMs > PERMANENT_THRESHOLD_MS) return "Permanently banned";
  return `Banned until ${new Date(bannedUntil).toLocaleDateString()}`;
}
