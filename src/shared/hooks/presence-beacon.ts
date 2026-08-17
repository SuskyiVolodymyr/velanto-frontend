"use client";

import { useEffect } from "react";
import { apiClient } from "@/shared/api/api-client";
import { useAuth } from "@/shared/contexts/auth-context";

/**
 * How often a visible tab says "still here".
 *
 * Comfortably inside the backend's presence window, so a visitor never flickers
 * out between beacons. Nothing on the server touches the database on this path,
 * so the cost is a request — not Neon compute time.
 */
export const BEACON_INTERVAL_MS = 60_000;

/**
 * Tells the API that a person is looking at the site.
 *
 * **Why this exists at all.** Presence used to be inferred on the server by
 * watching every request, and five releases in one day each removed a phantom
 * visitor that produced — Fly's health probe, Vercel's server-side renders,
 * `/auth/refresh`, and queries firing before the access token loaded. A server
 * cannot tell a browser from a script by looking at a request. This inverts it:
 * nothing is counted unless a browser deliberately says so, and none of those
 * callers run JavaScript. See velanto-backend#328.
 *
 * Three rules, each of which fixes a specific failure:
 *
 * 1. **Never beacon while auth is `loading`.** The access token lives in memory
 *    only, so it is null right after any page load. A beacon sent then would
 *    reach the server unauthenticated and count a signed-in reader as an
 *    anonymous visitor — the double count we chased for four releases. Waiting
 *    costs one refresh round-trip and makes it impossible rather than unlikely.
 *
 * 2. **Stop when the tab is hidden.** Otherwise a tab forgotten in a background
 *    window counts as a person indefinitely.
 *
 * 3. **Beacon on `pageshow`, not only on mount.** A page restored from the
 *    back/forward cache does not re-run effects, so pressing Back would
 *    otherwise make someone silently disappear.
 *
 * Failures are swallowed. Presence is observational, and a blocked or failed
 * beacon must never surface to the person browsing — it just means they go
 * uncounted, which is the safe direction for a figure that is a lower bound
 * anyway.
 */
export function usePresenceBeacon(): void {
  const { status } = useAuth();
  const ready = status !== "loading";

  useEffect(() => {
    if (!ready) return;

    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const send = () => {
      if (stopped || document.visibilityState !== "visible") return;
      void apiClient.post("/presence").catch(() => {
        // Deliberately silent — see the contract above.
      });
    };

    const start = () => {
      if (timer !== undefined) return;
      send();
      timer = setInterval(send, BEACON_INTERVAL_MS);
    };

    const stop = () => {
      if (timer === undefined) return;
      clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    // `pageshow` covers both the ordinary load and a back/forward-cache
    // restore, which is the case a mount-only effect misses.
    const onPageShow = () => {
      if (document.visibilityState === "visible") {
        stop();
        start();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      stopped = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [ready]);
}
