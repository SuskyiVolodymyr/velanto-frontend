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

type FetchResult =
  | { pack: Pack; results: PackResults | RankResults | null }
  | "notfound"
  | null;

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
  const { needsResults } = opts;
  const { status: authStatus } = useAuth();
  const [fetchResult, setFetchResult] = useState<FetchResult>(null);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    let cancelled = false;

    packsClient
      .getById(packId)
      .then(async (pack) => {
        if (!needsResults) return { pack, results: null };
        const results = await playsClient.getResults(packId);
        return { pack, results };
      })
      .then((result) => {
        if (cancelled) return;
        setFetchResult(result);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchResult("notfound");
      });

    return () => {
      cancelled = true;
    };
  }, [packId, authStatus, needsResults]);

  if (authStatus === "loading") return { status: "loading" };
  if (authStatus === "unauthenticated") return { status: "notfound" };
  if (fetchResult === null) return { status: "loading" };
  if (fetchResult === "notfound") return { status: "notfound" };
  return { status: "ready", pack: fetchResult.pack, results: fetchResult.results };
}
