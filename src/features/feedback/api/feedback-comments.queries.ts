"use client";

import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import type { FeedbackCommentList } from "@/src/shared/types/feedback";
import { fetchCommentsPage } from "./feedback-comments";

export function feedbackCommentsQueryOptions(feedbackId: string) {
  return infiniteQueryOptions({
    queryKey: ["feedback-comments", feedbackId] as const,
    queryFn: ({ pageParam }) => fetchCommentsPage(feedbackId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

export function useFeedbackComments(feedbackId: string) {
  return useInfiniteQuery(feedbackCommentsQueryOptions(feedbackId));
}

/**
 * Post a comment. On success the new comment is prepended into the first cached
 * page and every page's total is bumped, so the thread updates in place without
 * a refetch (matching the old optimistic-ish insert).
 */
export function useAddComment(feedbackId: string) {
  const queryClient = useQueryClient();
  const { queryKey } = feedbackCommentsQueryOptions(feedbackId);
  return useMutation({
    mutationFn: (body: string) => feedbackClient.addComment(feedbackId, { body }),
    onSuccess: (created) => {
      queryClient.setQueryData<InfiniteData<FeedbackCommentList, number>>(
        queryKey,
        (old) => {
          if (!old || old.pages.length === 0) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [
              {
                ...first,
                items: [created, ...first.items],
                total: first.total + 1,
              },
              ...rest.map((page) => ({ ...page, total: page.total + 1 })),
            ],
          };
        },
      );
    },
  });
}
