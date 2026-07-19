import { useQuery } from "@tanstack/react-query";
import { playsClient } from "@/src/shared/lib/plays-client";

/**
 * Resolves a `?play=<id>` result-share link to its recorded picks. Disabled when
 * there's no play id. A recorded play's picks are immutable, so the result is
 * cached forever and never refetched; a bad/expired id (404) is a hard error the
 * caller degrades from (no retry).
 */
export function useSharedPlay(playId: string | null) {
  return useQuery({
    queryKey: ["shared-play", playId] as const,
    queryFn: () => playsClient.getSharedPicks(playId as string),
    enabled: playId !== null,
    staleTime: Infinity,
    retry: false,
  });
}
