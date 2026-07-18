// The backend origin the OAuth popup lives on. Compared against every incoming
// message's origin so only our callback page can report a result.
const API_ORIGIN = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
).origin;

export type OAuthProvider = "google" | "discord";
export type OAuthPopupResult =
  | { ok: true }
  | { ok: false; error: "blocked" | "closed" | "oauth" };

/**
 * Runs a provider's OAuth flow in a popup and resolves when the backend callback
 * page posts the result back (`postMessage`) and closes itself.
 *
 * Security: we accept a message ONLY when its origin is our backend and it
 * carries the `source: "velanto-oauth"` marker — a stray window can't spoof a
 * sign-in. `blocked` means the browser blocked the popup; `closed` means the
 * user dismissed it before finishing.
 */
export function openOAuthPopup(
  provider: OAuthProvider,
): Promise<OAuthPopupResult> {
  return new Promise((resolve) => {
    const width = 500;
    const height = 650;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const popup = window.open(
      `${API_ORIGIN}/auth/${provider}`,
      "velanto-oauth",
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
    );
    if (!popup) {
      resolve({ ok: false, error: "blocked" });
      return;
    }

    let settled = false;
    const finish = (result: OAuthPopupResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      window.clearInterval(poll);
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== API_ORIGIN) return;
      const data = event.data as { source?: string; ok?: boolean } | null;
      if (!data || data.source !== "velanto-oauth") return;
      finish(data.ok ? { ok: true } : { ok: false, error: "oauth" });
    };
    window.addEventListener("message", onMessage);

    // The popup posts its result and then closes itself; those can arrive in
    // either order, so when we notice it's closed we give a just-sent success
    // message a brief moment to win before calling it a cancellation.
    const poll = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(poll);
      window.setTimeout(() => finish({ ok: false, error: "closed" }), 300);
    }, 400);
  });
}
