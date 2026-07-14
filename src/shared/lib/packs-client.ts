import { apiClient } from "@/src/shared/lib/api-client";
import type {
  Pack,
  PackFormat,
  PackTag,
  Group,
  Round,
} from "@/src/shared/types/pack";

export interface CreatePackInput {
  title: string;
  description: string;
  coverTone: string;
  // The storage KEY of an uploaded cover image (from POST /media, kind "cover").
  // Optional — omit or send nothing to keep the gradient `coverTone`.
  coverImageKey?: string;
  format: PackFormat;
  tags: PackTag[];
  groups: Group[];
  rounds: Round[];
}

export interface ListPacksFilters {
  format?: PackFormat;
  tags?: PackTag[];
  q?: string;
  page?: number;
  limit?: number;
  authorId?: string;
  /** Mirrors the backend's PACK_SORTS. Omitted behaves as "newest". */
  sort?: "popular" | "newest" | "oldest";
  window?: "day" | "week" | "month" | "year" | "all";
}

/**
 * The pending-pack queue's filters. A subset of ListPacksFilters — a pending
 * pack has no plays or votes, so "popular" is meaningless and the backend
 * rejects it. The queue defaults to "oldest" (FIFO), not "newest" like the
 * public feed does.
 */
export interface ModerationQueueFilters {
  q?: string;
  format?: PackFormat;
  sort?: "oldest" | "newest";
  page?: number;
  limit?: number;
}

export interface PackList {
  items: Pack[];
  total: number;
  page: number;
  limit: number;
}

export interface VoteResult {
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
}

function buildListQuery(filters: ListPacksFilters): string {
  const params = new URLSearchParams();
  if (filters.format) params.set("format", filters.format);
  if (filters.tags && filters.tags.length > 0)
    params.set("tags", filters.tags.join(","));
  if (filters.q) params.set("q", filters.q);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.authorId) params.set("authorId", filters.authorId);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.window) params.set("window", filters.window);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const packsClient = {
  create: (input: CreatePackInput) => apiClient.post<Pack>("/packs", input),
  update: (id: string, input: CreatePackInput) =>
    apiClient.patch<Pack>(`/packs/${id}`, input),
  getById: (id: string) => apiClient.get<Pack>(`/packs/${id}`),
  list: (filters: ListPacksFilters = {}) =>
    apiClient.get<PackList>(`/packs${buildListQuery(filters)}`),
  delete: (id: string) => apiClient.delete<{ deleted: true }>(`/packs/${id}`),
  vote: (id: string, value: 1 | -1) =>
    apiClient.post<VoteResult>(`/packs/${id}/vote`, { value }),
  unvote: (id: string) => apiClient.delete<VoteResult>(`/packs/${id}/vote`),
  moderationQueue: (filters: ModerationQueueFilters = {}) =>
    apiClient.get<PackList>(
      `/packs/moderation-queue${buildListQuery(filters)}`,
    ),
  approve: (id: string) => apiClient.post<Pack>(`/packs/${id}/approve`),
  reject: (id: string, reason?: string) =>
    apiClient.post<Pack>(`/packs/${id}/reject`, { reason }),
};
