import { apiClient } from "@/shared/lib/api-client";
import type {
  ChangeRequestMark,
  Pack,
  PackFormat,
  PackOverview,
  PackStatus,
  PackSummary,
  PackTag,
  Group,
  Round,
} from "@/shared/types/pack";
import type { PackLanguage } from "@/shared/types/pack-language";

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

/**
 * The list envelope. `T` defaults to `PackSummary` because no pack endpoint
 * returns a page of FULL packs any more — the moderation queue was the last
 * one, and it now serves card summaries like every other list.
 */
export interface PackList<T = PackSummary> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface VoteResult {
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
}

/**
 * What every write that moves a pack through moderation answers with — create,
 * update, submit, approve, reject and request-changes.
 *
 * Deliberately tiny, and this client barely reads it: `create` takes `id` to
 * navigate to the new pack, and the rest discard the body entirely. A decision
 * removes a row from the queue, and only the server knows which row slides up
 * to replace it, so they invalidate and refetch rather than patch the cache.
 * The shape exists for the API's other consumer, the MCP server, which shows
 * the outcome to an agent — hence `title`, so it can name the pack it acted on.
 *
 * All six used to return the whole `Pack`, content included — which on create
 * and update meant the server echoing back what we had just sent it.
 */
export interface PackWriteOutcome {
  id: string;
  title: string;
  status: PackStatus;
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
  // These three answer with PackWriteOutcome, not the pack: we just SENT the
  // content, so the only new fact is where moderation put it.
  create: (input: CreatePackInput) =>
    apiClient.post<PackWriteOutcome>("/packs", input),
  update: (id: string, input: CreatePackInput) =>
    apiClient.patch<PackWriteOutcome>(`/packs/${id}`, input),
  /** Publish a draft (author-only). A dedicated endpoint rather than a PATCH:
   *  update is a full replacement, so submitting through it would mean
   *  re-sending the whole pack just to change its status. */
  submit: (id: string) =>
    apiClient.post<PackWriteOutcome>(`/packs/${id}/submit`),
  getById: (id: string) => apiClient.get<Pack>(`/packs/${id}`),
  // The pack page's shape: no `groups`, rounds collapsed to chips. Use getById
  // for anything that plays, edits or reviews a pack — see PackOverview.
  getOverview: (id: string) =>
    apiClient.get<PackOverview>(`/packs/${id}/overview`),
  list: (filters: ListPacksFilters = {}) =>
    apiClient.get<PackList<PackSummary>>(`/packs${buildListQuery(filters)}`),
  delete: (id: string) => apiClient.delete<{ deleted: true }>(`/packs/${id}`),
  vote: (id: string, value: 1 | -1) =>
    apiClient.post<VoteResult>(`/packs/${id}/vote`, { value }),
  unvote: (id: string) => apiClient.delete<VoteResult>(`/packs/${id}/vote`),
  /**
   * The pending backlog, as CARD summaries — not full packs.
   *
   * The queue table draws a title, an author, a format and a submission date;
   * opening a row navigates to the review screen, which fetches that pack by
   * id. This used to be typed (and served) as full `Pack`s, so every queued row
   * carried its entire content — every pool, round and item — to render four
   * columns.
   */
  moderationQueue: (filters: ModerationQueueFilters = {}) =>
    apiClient.get<PackList<PackSummary>>(
      `/packs/moderation-queue${buildListQuery(filters)}`,
    ),
  approve: (id: string) =>
    apiClient.post<PackWriteOutcome>(`/packs/${id}/approve`),
  /**
   * The third review outcome: hand the pack back to its author with a list of
   * what has to change. `message` is required (a bare list of marks explains
   * nothing); `marks` may be empty when the whole pack is the problem.
   */
  requestChanges: (
    id: string,
    body: { message: string; marks: ChangeRequestMark[] },
  ) => apiClient.post<PackWriteOutcome>(`/packs/${id}/request-changes`, body),
  reject: (id: string, reason?: string) =>
    apiClient.post<PackWriteOutcome>(`/packs/${id}/reject`, { reason }),
};
