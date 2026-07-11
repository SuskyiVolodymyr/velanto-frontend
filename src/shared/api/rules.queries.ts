import { queryOptions, useQuery } from "@tanstack/react-query";
import { rulesClient } from "@/src/shared/lib/rules-client";

/**
 * Shared query for the community-rules document (category titles + rule text).
 * App-wide and rarely changing, so a long-lived cache is fine — callers pass
 * `enabled` to gate it (e.g. only fetch for a moderator view).
 */
export function rulesQueryOptions() {
  return queryOptions({
    queryKey: ["rules"] as const,
    queryFn: () => rulesClient.getRules(),
  });
}

export function useRules({ enabled }: { enabled?: boolean } = {}) {
  return useQuery({ ...rulesQueryOptions(), enabled });
}
