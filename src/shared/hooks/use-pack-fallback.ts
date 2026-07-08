"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

export type PackFallbackState =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "ready"; pack: Pack; results: PackResults | RankResults | null };

/**
 * Retries a pack (and optionally its results) as the authenticated viewer,
 * for the case where the Server Component's anonymous fetch already
 * returned null. Never 404s while auth is still resolving, and never
 * attempts the retry at all for an unauthenticated viewer (that always
 * fails the same way the anonymous SSR fetch already did).
 */
export function usePackFallback(
  packId: string,
  opts: { needsResults: boolean },
): PackFallbackState {
  const { status: authStatus } = useAuth();
  const [state, setState] = useState<PackFallbackState>({ status: "loading" });

  useEffect(() => {
    if (authStatus === "loading") {
      setState({ status: "loading" });
      return;
    }
    if (authStatus === "unauthenticated") {
      setState({ status: "notfound" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    packsClient
      .getById(packId)
      .then(async (pack) => {
        if (!opts.needsResults) return { pack, results: null };
        const results = await playsClient.getResults(packId);
        return { pack, results };
      })
      .then(({ pack, results }) => {
        if (cancelled) return;
        setState({ status: "ready", pack, results });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "notfound" });
      });

    return () => {
      cancelled = true;
    };
    // opts.needsResults is a caller-supplied constant for a given fallback
    // component, not reactive state — omitted from deps deliberately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId, authStatus]);

  return state;
}
