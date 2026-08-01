import {
  queryOptions,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { getUserSearch } from "./user-search";

export function userSearchQueryOptions(q: string, page: number) {
  return queryOptions({
    queryKey: ["user-search", q, page] as const,
    queryFn: () => getUserSearch(q, page),
  });
}

/**
 * The people directory, keyed on the (debounced) query + page. Always enabled:
 * an empty query is the meaningful "everyone, alphabetically" request that
 * /people opens on, not a request to suppress. (It used to be gated on a
 * two-character minimum the backend enforced; that floor is gone.)
 *
 * `keepPreviousData` keeps results steady while paging/typing; `staleTime: 0`
 * refetches so follow state and new accounts stay fresh. The
 * `["user-search", …]` key is what the follow mutation patches so a row's button
 * updates in place (see useFollowListRowMutation).
 */
export function useUserSearch(q: string, page: number) {
  return useQuery({
    ...userSearchQueryOptions(q, page),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
