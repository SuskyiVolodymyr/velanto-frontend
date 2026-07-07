import { apiClient } from "@/src/shared/lib/api-client";
import type { Comment } from "@/src/shared/types/comment";

export interface CreateCommentInput {
  body: string;
}

export const commentsClient = {
  list: (packId: string) => apiClient.get<Comment[]>(`/packs/${packId}/comments`),
  create: (packId: string, input: CreateCommentInput) =>
    apiClient.post<Comment>(`/packs/${packId}/comments`, input),
};
