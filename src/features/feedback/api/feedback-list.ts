import { feedbackClient } from "@/src/shared/lib/feedback-client";
import type {
  FeedbackList,
  FeedbackSort,
  FeedbackStatus,
  FeedbackTopic,
} from "@/src/shared/types/feedback";

export const FEEDBACK_PAGE_SIZE = 20;
export const FEEDBACK_TOP_LIMIT = 3;

/**
 * The board's list request, resolved from the UI filter state (empty search →
 * undefined). Also the query key, so its values fully determine a cache entry.
 * `page`/`limit` are supplied per page by the infinite query, not here.
 */
export interface FeedbackListFilters {
  q?: string;
  topic?: FeedbackTopic;
  status?: FeedbackStatus;
  sort: FeedbackSort;
}

export function fetchFeedbackPage(
  filters: FeedbackListFilters,
  page: number,
): Promise<FeedbackList> {
  return feedbackClient.list({
    q: filters.q,
    topic: filters.topic,
    status: filters.status,
    sort: filters.sort,
    page,
    limit: FEEDBACK_PAGE_SIZE,
  });
}

export function fetchTopFeedback(): Promise<FeedbackList> {
  return feedbackClient.list({ sort: "top", limit: FEEDBACK_TOP_LIMIT });
}
