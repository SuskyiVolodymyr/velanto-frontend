"use client";

import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import { useClientData } from "@/src/shared/hooks/useClientData";
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
 *
 * Built on `useClientData`, which owns the fetch/abort lifecycle; this hook
 * only layers the auth-gating state machine on top.
 */
export function usePackFallback(
  packId: string,
  opts: { needsResults: boolean },
): PackFallbackState {
  const { needsResults } = opts;
  const { status: authStatus } = useAuth();

  const { data, error } = useClientData<{
    pack: Pack;
    results: PackResults | RankResults | null;
  }>(
    async () => {
      const pack = await packsClient.getById(packId);
      if (!needsResults) return { pack, results: null };
      const results = await playsClient.getResults(packId);
      return { pack, results };
    },
    [packId, needsResults],
    { enabled: authStatus === "authenticated" },
  );

  if (authStatus === "loading") return { status: "loading" };
  if (authStatus === "unauthenticated") return { status: "notfound" };
  if (error) return { status: "notfound" };
  if (data === null) return { status: "loading" };
  return { status: "ready", pack: data.pack, results: data.results };
}
