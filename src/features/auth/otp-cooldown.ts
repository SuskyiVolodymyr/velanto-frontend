/**
 * Resend cooldown for the email OTP step, persisted in localStorage so it
 * survives a page refresh (the user can't dodge the wait by reloading). Keyed
 * per email address, storing the epoch-ms timestamp of the last send.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

const KEY_PREFIX = "velanto:otp-sent:";

function key(email: string): string {
  return `${KEY_PREFIX}${email.trim().toLowerCase()}`;
}

/** Record that a code was just sent to `email` (starts the cooldown). */
export function markCodeSent(email: string): void {
  try {
    localStorage.setItem(key(email), String(Date.now()));
  } catch {
    // localStorage unavailable (private mode / SSR) — cooldown just won't persist.
  }
}

/**
 * Seconds remaining before another code may be requested for `email`, or 0 if
 * the cooldown has elapsed, none is recorded, or the stored value is unusable.
 */
export function getResendCooldownRemaining(email: string): number {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key(email));
  } catch {
    return 0;
  }
  if (!raw) return 0;
  const sentAt = Number(raw);
  if (!Number.isFinite(sentAt)) return 0;
  const elapsed = (Date.now() - sentAt) / 1000;
  const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
  return remaining > 0 ? Math.min(remaining, RESEND_COOLDOWN_SECONDS) : 0;
}
