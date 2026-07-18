import { queryOptions, useQuery } from "@tanstack/react-query";
import { getFeedback } from "./feedback-detail";
import { useRefetchOnSignIn } from "@/src/shared/lib/use-refetch-on-sign-in";

export function feedbackQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["feedback", id] as const,
    queryFn: () => getFeedback(id),
  });
}

/**
 * A single feedback post. `retry: false` matches the old fetch behavior — a 404
 * (deleted or staff-only) is definitive, so there's no point retrying it before
 * showing the not-found state.
 */
export function useFeedback(id: string) {
  const query = useQuery({ ...feedbackQueryOptions(id), retry: false });
  // Restore the viewer's own vote colour after a hard refresh fetched the post
  // anonymously (see useRefetchOnSignIn).
  useRefetchOnSignIn(query.refetch);
  return query;
}
