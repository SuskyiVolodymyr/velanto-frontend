import { apiClient } from "@/src/shared/lib/api-client";
import type { Comment } from "@/src/shared/types/comment";
import type { VoteTally } from "@/src/shared/api/vote.mutations";

export type CommentSort = "top" | "new";

export interface CreateCommentInput {
  body: string;
  /** When set, this comment is a reply to the given root comment. */
  parentId?: string;
}

export interface ListCommentsFilters {
  page?: number;
  limit?: number;
  /** Root ordering: "top" (net score) or "new" (newest first). */
  sort?: CommentSort;
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
  if (filters.sort !== undefined) params.set("sort", filters.sort);
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
  vote: (packId: string, commentId: string, value: 1 | -1) =>
    apiClient.post<VoteTally>(`/packs/${packId}/comments/${commentId}/vote`, {
      value,
    }),
  delete: (packId: string, commentId: string) =>
    apiClient.delete<void>(`/packs/${packId}/comments/${commentId}`),
};
