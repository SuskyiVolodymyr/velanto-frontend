"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import type { Feedback, FeedbackStatus } from "@/src/shared/types/feedback";
import { feedbackQueryOptions } from "./feedback-detail.queries";

/**
 * Staff status change for a feedback post. On success the post's cache entry is
 * patched with the returned post, so the detail view reflects the new status
 * without a refetch.
 */
export function useSetFeedbackStatus(feedbackId: string) {
  const queryClient = useQueryClient();
  const { queryKey } = feedbackQueryOptions(feedbackId);
  return useMutation({
    mutationFn: (status: FeedbackStatus) =>
      feedbackClient.setStatus(feedbackId, status),
    onSuccess: (updated) => {
      queryClient.setQueryData<Feedback>(queryKey, (prev) =>
        prev ? { ...prev, ...updated } : updated,
      );
    },
  });
}

/**
 * Delete a feedback post. Navigation away is the caller's concern (passed via
 * `mutate`'s per-call `onSuccess`), since the detail cache entry is moot once
 * the post is gone.
 */
export function useDeleteFeedback(feedbackId: string) {
  return useMutation({
    mutationFn: () => feedbackClient.remove(feedbackId),
  });
}
