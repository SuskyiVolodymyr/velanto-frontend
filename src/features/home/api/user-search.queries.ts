import {
  queryOptions,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { getUserSearch, MIN_SEARCH_LENGTH } from "./user-search";

export function userSearchQueryOptions(q: string, page: number) {
  return queryOptions({
    queryKey: ["user-search", q, page] as const,
    queryFn: () => getUserSearch(q, page),
  });
}

/**
 * People search, keyed on the (debounced) query + page. Disabled until the query
 * meets the minimum length, so a too-short query never hits the backend.
 * `keepPreviousData` keeps results steady while paging/typing; `staleTime: 0`
 * refetches so follow state and new accounts stay fresh. The
 * `["user-search", …]` key is what the follow mutation patches so a row's button
 * updates in place (see useFollowListRowMutation).
 */
export function useUserSearch(q: string, page: number) {
  return useQuery({
    ...userSearchQueryOptions(q, page),
    enabled: q.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
