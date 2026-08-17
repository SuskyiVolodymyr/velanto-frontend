import { feedbackClient } from "@/shared/api/feedback-client";
import type { FeedbackCommentList } from "@/shared/types/feedback";

export const FEEDBACK_COMMENTS_PAGE_SIZE = 10;

/** Fetch function (no React) for one page of a post's comments. */
export function fetchCommentsPage(
  feedbackId: string,
  page: number,
): Promise<FeedbackCommentList> {
  return feedbackClient.listComments(feedbackId, {
    page,
    limit: FEEDBACK_COMMENTS_PAGE_SIZE,
  });
}
