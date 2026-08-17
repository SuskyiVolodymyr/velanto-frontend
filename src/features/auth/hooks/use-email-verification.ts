import { useEffect, useState } from "react";
import { authClient } from "@/api/auth-client";

/**
 * Whether register uses the two-step email-ownership code. Reported by the
 * backend (GET /auth/providers) and off by default, so the form starts in the
 * one-step state — matching production — and never flashes the code step for the
 * common case. Only flips to two-step if the backend says the gate is on.
 */
export function useEmailVerification(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authClient
      .oauthProviders()
      .then((p) => {
        if (!cancelled) setEnabled(p.emailVerification ?? false);
      })
      // Unreachable/older backend → leave the one-step default; the backend
      // enforces the code itself if its gate is actually on.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
