"use client";

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { packsClient } from "@/src/shared/lib/packs-client";
import {
  fetchModerationCounts,
  fetchPackQueuePage,
  type PackQueueFilters,
} from "./moderation";

/**
 * The pack queue pages with Prev/Next, so this is a page-at-a-time query, not
 * an infinite one. `keepPreviousData` holds the current page on screen while
 * the next loads, instead of flashing empty.
 */
export function packQueueQueryOptions(filters: PackQueueFilters, page: number) {
  return queryOptions({
    queryKey: ["pack-queue", filters, page] as const,
    queryFn: () => fetchPackQueuePage(filters, page),
    placeholderData: keepPreviousData,
  });
}

/** Pass `enabled` to gate the fetch to an authorized viewer. */
export function usePackQueue(
  filters: PackQueueFilters,
  page: number,
  { enabled }: { enabled: boolean },
) {
  return useQuery({ ...packQueueQueryOptions(filters, page), enabled });
}

export function moderationCountsQueryOptions() {
  return queryOptions({
    queryKey: ["moderation-counts"] as const,
    queryFn: fetchModerationCounts,
  });
}

/** Backs the tab badges. */
export function useModerationCounts({ enabled }: { enabled: boolean }) {
  return useQuery({ ...moderationCountsQueryOptions(), enabled });
}

/**
 * Refetch the queues after an action that took work OUT of one of them.
 *
 * Invalidated, not hand-patched: the page the moderator is looking at now has a
 * hole in it, and the row that slides up to fill it lives on the next page —
 * only the server knows which. The counts go with it, because the tab badges are
 * the whole reason the two queues share a panel; a badge that still counts the
 * report you just closed is worse than no badge. `staleTime` is 30s globally, so
 * without this the stale row and stale badge survive a navigate-away-and-back.
 *
 * Exported so EVERY caller that resolves queued work uses it — the report detail
 * screen's review/close/delete-pack actions included, not just approve/reject.
 */
export function useModerationInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pack-queue"] }),
      queryClient.invalidateQueries({ queryKey: ["reports-list"] }),
      queryClient.invalidateQueries({ queryKey: ["moderation-counts"] }),
    ]);
  };
}

export function useApprovePack() {
  const invalidate = useModerationInvalidation();
  return useMutation({
    mutationFn: (id: string) => packsClient.approve(id),
    onSuccess: invalidate,
  });
}

export function useRejectPack() {
  const invalidate = useModerationInvalidation();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      packsClient.reject(id, reason),
    onSuccess: invalidate,
  });
}
