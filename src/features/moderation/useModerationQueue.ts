"use client";

import { useState } from "react";
import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { packsClient } from "@/src/shared/lib/packs-client";

const PAGE_SIZE = 20;

type QueuePage = Awaited<ReturnType<typeof packsClient.moderationQueue>>;

function moderationQueueQueryOptions() {
  return infiniteQueryOptions({
    queryKey: ["moderation-queue"] as const,
    queryFn: ({ pageParam }) =>
      packsClient.moderationQueue({ page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

// Owns the moderation-queue data (an infinite query) plus the approve/reject
// mutations, which remove the pack from the cached list on success. `page`
// lives in the query cache; per-row busy/error are derived from the mutations'
// `variables` (one row is acted on at a time). Pass `enabled` so the fetch only
// runs for an authorized viewer.
export function useModerationQueue({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const { queryKey } = moderationQueueQueryOptions();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queueQuery = useInfiniteQuery({
    ...moderationQueueQueryOptions(),
    enabled,
  });

  const seen = new Set<string>();
  const packs = (queueQuery.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((pack) => {
      if (seen.has(pack.id)) return false;
      seen.add(pack.id);
      return true;
    });
  const total = queueQuery.data?.pages.at(-1)?.total ?? 0;
  const hasData = queueQuery.data !== undefined;

  function removeFromQueue(id: string) {
    queryClient.setQueryData<InfiniteData<QueuePage, number>>(queryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((pack) => pack.id !== id),
              total: page.total - 1,
            })),
          }
        : old,
    );
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => packsClient.approve(id),
    onSuccess: (_result, id) => removeFromQueue(id),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      packsClient.reject(id, reason),
    onSuccess: (_result, { id }) => {
      removeFromQueue(id);
      setRejectingId(null);
      setRejectReason("");
    },
  });

  // Rebuild the Record<id, …> shape the row component expects from the two
  // mutations' in-flight/errored variables.
  const rowBusy: Record<string, boolean> = {};
  const rowError: Record<string, string> = {};
  if (approveMutation.isPending && approveMutation.variables) {
    rowBusy[approveMutation.variables] = true;
  }
  if (rejectMutation.isPending && rejectMutation.variables) {
    rowBusy[rejectMutation.variables.id] = true;
  }
  if (approveMutation.isError && approveMutation.variables) {
    rowError[approveMutation.variables] = "Couldn't approve this pack. Try again.";
  }
  if (rejectMutation.isError && rejectMutation.variables) {
    rowError[rejectMutation.variables.id] = "Couldn't reject this pack. Try again.";
  }

  return {
    packs,
    total,
    hasData,
    loading: queueQuery.isLoading,
    error: !hasData && queueQuery.isError ? (queueQuery.error as Error) : null,
    loadingMore: queueQuery.isFetchingNextPage,
    loadMoreError:
      hasData && (queueQuery.isError || queueQuery.isFetchNextPageError)
        ? "Couldn't load more packs. Try again."
        : "",
    rowBusy,
    rowError,
    rejectingId,
    rejectReason,
    setRejectReason,
    toggleReject: (id: string) => {
      setRejectingId((prev) => (prev === id ? null : id));
      setRejectReason("");
    },
    cancelReject: () => setRejectingId(null),
    handleLoadMore: () => queueQuery.fetchNextPage(),
    handleApprove: (id: string) => approveMutation.mutate(id),
    handleReject: (id: string) =>
      rejectMutation.mutate({ id, reason: rejectReason.trim() || undefined }),
  };
}
