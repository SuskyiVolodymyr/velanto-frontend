"use client";

import { useQuery } from "@tanstack/react-query";
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
 *
 * Built on React Query, which owns the fetch lifecycle; this hook only layers
 * the auth-gating state machine on top. `retry: false` because a failed fetch
 * here is definitive — the anonymous SSR fetch already returned null, so a
 * failed authed retry means not-found, not a transient blip worth retrying.
 */
export function usePackFallback(
  packId: string,
  opts: { needsResults: boolean },
): PackFallbackState {
  const { needsResults } = opts;
  const { status: authStatus } = useAuth();

  const { data, isError } = useQuery({
    queryKey: ["pack-fallback", packId, needsResults] as const,
    queryFn: async () => {
      const pack = await packsClient.getById(packId);
      if (!needsResults) {
        return { pack, results: null as PackResults | RankResults | null };
      }
      const results = await playsClient.getResults(packId);
      return { pack, results };
    },
    enabled: authStatus === "authenticated",
    retry: false,
  });

  if (authStatus === "loading") return { status: "loading" };
  if (authStatus === "unauthenticated") return { status: "notfound" };
  if (isError) return { status: "notfound" };
  if (data === undefined) return { status: "loading" };
  return { status: "ready", pack: data.pack, results: data.results };
}
