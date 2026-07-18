import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import {
  fetchFeedbackPage,
  fetchTopFeedback,
  type FeedbackListFilters,
} from "./feedback-list";
import { useRefetchOnSignIn } from "@/src/shared/lib/use-refetch-on-sign-in";

/**
 * The paginated board list, keyed on the active filters. Each page appends via
 * the infinite query; `getNextPageParam` stops once every item is loaded. No
 * `placeholderData`, so a filter change shows a loading state (not the stale
 * list) and resets any load-more error — matching the board's prior behavior.
 */
export function feedbackListQueryOptions(filters: FeedbackListFilters) {
  return infiniteQueryOptions({
    queryKey: ["feedback-list", filters] as const,
    queryFn: ({ pageParam }) => fetchFeedbackPage(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (count, page) => count + page.items.length,
        0,
      );
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

export function useFeedbackList(filters: FeedbackListFilters) {
  const query = useInfiniteQuery(feedbackListQueryOptions(filters));
  // A hard refresh fetches the list before the token is restored, so every
  // item's `myVote` comes back null; refetch as the viewer once signed in so
  // their own likes/dislikes light up again (velanto-frontend#8-batch).
  useRefetchOnSignIn(query.refetch);
  return query;
}

export function topFeedbackQueryOptions() {
  return queryOptions({
    queryKey: ["feedback-top"] as const,
    queryFn: fetchTopFeedback,
  });
}

export function useTopFeedback() {
  const query = useQuery(topFeedbackQueryOptions());
  useRefetchOnSignIn(query.refetch);
  return query;
}
