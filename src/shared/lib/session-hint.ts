// A tiny, non-sensitive "you're signed in" hint cookie on the FRONTEND origin.
// The real session is the httpOnly refresh cookie on the API origin, which
// Next.js middleware here can't read (different domain in prod) — this hint is
// the one bit of auth state the middleware CAN see, so it can redirect a
// signed-in visitor away from /auth server-side (no login-form flash). Kept in
// sync with auth state; a stale hint self-heals (the redirect destination's
// bootstrap refresh fails, flips to unauthenticated, and clears it).
export const SESSION_HINT_COOKIE = "velanto_session";

export function setSessionHint(active: boolean): void {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = active
    ? // ~400 days — the browser cap for persistent cookies anyway.
      `${SESSION_HINT_COOKIE}=1; path=/; max-age=34560000; samesite=lax${secure}`
    : `${SESSION_HINT_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
}
