import { apiClient } from "@/src/shared/lib/api-client";
import type {
  CreateFeedbackInput,
  Feedback,
  FeedbackComment,
  FeedbackCommentList,
  FeedbackList,
  FeedbackStatus,
  FeedbackVoteResult,
  ListFeedbackFilters,
} from "@/src/shared/types/feedback";

function buildListQuery(filters: ListFeedbackFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.status) params.set("status", filters.status);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildPageQuery(page: { page?: number; limit?: number }): string {
  const params = new URLSearchParams();
  if (page.page !== undefined) params.set("page", String(page.page));
  if (page.limit !== undefined) params.set("limit", String(page.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const feedbackClient = {
  list: (filters: ListFeedbackFilters = {}) =>
    apiClient.get<FeedbackList>(`/feedback${buildListQuery(filters)}`),
  getById: (id: string) => apiClient.get<Feedback>(`/feedback/${id}`),
  create: (input: CreateFeedbackInput) => apiClient.post<Feedback>("/feedback", input),
  setStatus: (id: string, status: FeedbackStatus) =>
    apiClient.patch<Feedback>(`/feedback/${id}/status`, { status }),
  remove: (id: string) => apiClient.delete<undefined>(`/feedback/${id}`),
  vote: (id: string, value: 1 | -1) =>
    apiClient.post<FeedbackVoteResult>(`/feedback/${id}/vote`, { value }),
  listComments: (id: string, page: { page?: number; limit?: number } = {}) =>
    apiClient.get<FeedbackCommentList>(`/feedback/${id}/comments${buildPageQuery(page)}`),
  addComment: (id: string, input: { body: string }) =>
    apiClient.post<FeedbackComment>(`/feedback/${id}/comments`, input),
};
