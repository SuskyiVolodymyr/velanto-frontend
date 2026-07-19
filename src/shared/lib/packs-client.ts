import { apiClient } from "@/src/shared/lib/api-client";
import type {
  Pack,
  PackFormat,
  PackStatus,
  PackTag,
  Group,
  Round,
} from "@/src/shared/types/pack";
import type { PackLanguage } from "@/src/shared/types/pack-language";

export interface CreatePackInput {
  title: string;
  description: string;
  coverTone: string;
  // The storage KEY of an uploaded cover image (from POST /media, kind "cover").
  // Optional — omit or send nothing to keep the gradient `coverTone`.
  coverImageKey?: string;
  format: PackFormat;
  /** The pack CONTENT's language. The API defaults it to English if omitted,
   * and preserves the existing value on update — but the form always sends it. */
  language: PackLanguage;
  tags: PackTag[];
  groups: Group[];
  rounds: Round[];
  /** Save-as-draft intent. true → stored as an author-only draft (skips
   *  moderation); false/omitted → publish (goes to pending/approved). */
  draft?: boolean;
}

export interface ListPacksFilters {
  format?: PackFormat;
  tags?: PackTag[];
  /** Multi-select: packs written in ANY of these. Empty/absent = no filter. */
  languages?: PackLanguage[];
  q?: string;
  page?: number;
  limit?: number;
  authorId?: string;
  /**
   * Filter to one moderation status. The backend only honours this for a
   * self-author view (`authorId` = the signed-in user); for anyone else the
   * list is already forced to approved-only, so a `status` there is ignored.
   * Used by the "My packs" tab.
   */
  status?: PackStatus;
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
  // Omitted entirely when empty — an empty `?languages=` is a 400, and "no
  // language selected" means no filter, not "match nothing".
  if (filters.languages && filters.languages.length > 0)
    params.set("languages", filters.languages.join(","));
  if (filters.q) params.set("q", filters.q);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.authorId) params.set("authorId", filters.authorId);
  if (filters.status) params.set("status", filters.status);
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
