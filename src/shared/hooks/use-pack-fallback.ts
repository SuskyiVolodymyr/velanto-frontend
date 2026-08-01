"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import { friendsRoomsClient } from "@/src/features/friends-rooms/friends-rooms-client";
import type { AvailableMode } from "@/src/features/friends-rooms/room-types";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

export type PackFallbackState =
  | { status: "loading" }
  | { status: "notfound" }
  | {
      status: "ready";
      pack: Pack;
      results: PackResults | RankResults | null;
      /** Only populated when `opts.needsAvailableModes` was set; null otherwise. */
      availableModes: AvailableMode[] | null;
    };

/**
 * Retries a pack (and optionally its results/available modes) as the
 * authenticated viewer, for the case where the Server Component's anonymous
 * fetch already returned null. Never 404s while auth is still resolving, and
 * never attempts the retry at all for an unauthenticated viewer (that always
 * fails the same way the anonymous SSR fetch already did).
 *
 * Built on React Query, which owns the fetch lifecycle; this hook only layers
 * the auth-gating state machine on top. `retry: false` because a failed fetch
 * here is definitive — the anonymous SSR fetch already returned null, so a
 * failed authed retry means not-found, not a transient blip worth retrying.
 */
export function usePackFallback(
  packId: string,
  opts: { needsResults: boolean; needsAvailableModes?: boolean },
): PackFallbackState {
  const { needsResults, needsAvailableModes = false } = opts;
  const { status: authStatus } = useAuth();

  const { data, isError } = useQuery({
    queryKey: [
      "pack-fallback",
      packId,
      needsResults,
      needsAvailableModes,
    ] as const,
    queryFn: async () => {
      const [pack, results, availableModes] = await Promise.all([
        packsClient.getById(packId),
        needsResults ? playsClient.getResults(packId) : Promise.resolve(null),
        needsAvailableModes
          ? friendsRoomsClient.availableModes(packId)
          : Promise.resolve(null),
      ]);
      return { pack, results, availableModes };
    },
    enabled: authStatus === "authenticated",
    retry: false,
  });

  if (authStatus === "loading") return { status: "loading" };
  if (authStatus === "unauthenticated") return { status: "notfound" };
  if (isError) return { status: "notfound" };
  if (data === undefined) return { status: "loading" };
  return {
    status: "ready",
    pack: data.pack,
    results: data.results,
    availableModes: data.availableModes,
  };
}
