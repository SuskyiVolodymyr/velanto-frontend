/**
 * Resend cooldown for the email OTP step, persisted in localStorage so the
 * countdown survives a page refresh.
 *
 * This is a **display concern, not a guard**. The real limits are server-side:
 * `POST /auth/email-verification/request` is throttled per IP (5/60s) and
 * per address (`RESEND_COOLDOWN_MS`, 30s) in velanto-backend. Clearing this
 * storage buys nothing but a button that stops greying out. That's why the
 * record here is treated as disposable — it exists to render a timer.
 *
 * Storage shape (#225): ONE key holding `{ [hash]: epochMs }`, swept of expired
 * entries on every read and write. It previously used the address itself as the
 * key (`velanto:otp-sent:someone@example.com`) and never removed it — so a
 * 60-second timer left a plaintext personal identifier in the browser forever,
 * past logout, accumulating one entry per person on a shared machine.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/** The single key this module owns. */
export const OTP_SENT_STORAGE_KEY = "velanto:otp-sent";

type CooldownMap = Record<string, number>;

/**
 * FNV-1a (32-bit), returned as base36. Not a security control and not meant to
 * be one: an email is a guessable input, so anyone who suspects a specific
 * address can hash it and check — no salt would survive in client code anyway.
 * What it buys is that the stored blob can't be *read off* as a list of who
 * used this browser. The sweep below is what actually bounds the exposure, by
 * keeping nothing past the 60 seconds it's needed.
 */
function hashEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    // *= 16777619 in 32-bit space, via shifts to dodge float precision loss.
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    hash >>>= 0;
  }
  return hash.toString(36);
}

/** Entries at or past this age are dead and must not be persisted. */
function isLive(sentAt: unknown, now: number): sentAt is number {
  if (typeof sentAt !== "number" || !Number.isFinite(sentAt)) return false;
  return now - sentAt < RESEND_COOLDOWN_SECONDS * 1000;
}

function read(): CooldownMap {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(OTP_SENT_STORAGE_KEY);
  } catch {
    return {};
  }
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    // Arrays are objects too; neither they nor a bare string/number are ours.
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return {};
    return parsed as CooldownMap;
  } catch {
    return {};
  }
}

/** Persists `map`, dropping the key entirely when nothing live is left. */
function write(map: CooldownMap): void {
  try {
    if (Object.keys(map).length === 0) {
      localStorage.removeItem(OTP_SENT_STORAGE_KEY);
      return;
    }
    localStorage.setItem(OTP_SENT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable (private mode / quota) — the countdown just won't
    // persist across a refresh. The server-side cooldown still holds.
  }
}

/** Drops every expired or malformed entry. */
function sweep(map: CooldownMap, now: number): CooldownMap {
  const live: CooldownMap = {};
  for (const [hash, sentAt] of Object.entries(map)) {
    if (isLive(sentAt, now)) live[hash] = sentAt;
  }
  return live;
}

/** Record that a code was just sent to `email` (starts the cooldown). */
export function markCodeSent(email: string): void {
  const now = Date.now();
  const map = sweep(read(), now);
  map[hashEmail(email)] = now;
  write(map);
}

/**
 * Seconds remaining before another code may be requested for `email`, or 0 if
 * the cooldown has elapsed, none is recorded, or the stored value is unusable.
 *
 * Sweeps expired entries as a side effect: this is the only call the OtpStep
 * makes on a timer, so it's the natural place to take out the rubbish, and it
 * means a dead entry can't survive merely because the user never sent again.
 */
export function getResendCooldownRemaining(email: string): number {
  const now = Date.now();
  const map = read();
  const live = sweep(map, now);
  if (Object.keys(live).length !== Object.keys(map).length) write(live);

  const sentAt = live[hashEmail(email)];
  if (sentAt === undefined) return 0;

  const elapsed = (now - sentAt) / 1000;
  const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
  // Clamp: a backwards clock or tampered entry must not strand the user behind
  // a cooldown longer than the one they signed up for.
  return remaining > 0 ? Math.min(remaining, RESEND_COOLDOWN_SECONDS) : 0;
}
