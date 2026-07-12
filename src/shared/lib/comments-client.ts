import { apiClient } from "@/src/shared/lib/api-client";
import type { Comment } from "@/src/shared/types/comment";

export interface CreateCommentInput {
  body: string;
  /** When set, this comment is a reply to the given root comment. */
  parentId?: string;
}

export interface ListCommentsFilters {
  page?: number;
  limit?: number;
}

export interface CommentList {
  items: Comment[];
  total: number;
  page: number;
  limit: number;
}

function buildListQuery(filters: ListCommentsFilters): string {
  const params = new URLSearchParams();
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const commentsClient = {
  list: (packId: string, filters: ListCommentsFilters = {}) =>
    apiClient.get<CommentList>(
      `/packs/${packId}/comments${buildListQuery(filters)}`,
    ),
  create: (packId: string, input: CreateCommentInput) =>
    apiClient.post<Comment>(`/packs/${packId}/comments`, input),
  delete: (packId: string, commentId: string) =>
    apiClient.delete<void>(`/packs/${packId}/comments/${commentId}`),
};
