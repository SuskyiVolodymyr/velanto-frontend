"use client";

import { useState } from "react";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { packsClient } from "@/src/shared/lib/packs-client";

const PAGE_SIZE = 20;

// Owns the moderation-queue data lifecycle and the approve/reject/load-more
// mutations. `useClientData` owns the loading/error/abort lifecycle; `page`
// lives in the fetched data, and approve/reject mutate the cached list via
// setData. Pass `enabled` so the fetch only runs for an authorized viewer.
export function useModerationQueue({ enabled }: { enabled: boolean }) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queueQuery = useClientData(
    async () => {
      const result = await packsClient.moderationQueue({
        page: 1,
        limit: PAGE_SIZE,
      });
      return { items: result.items, total: result.total, page: 1 };
    },
    [],
    { enabled },
  );

  async function handleLoadMore() {
    const current = queueQuery.data;
    if (!current) return;
    setLoadingMore(true);
    try {
      const nextPage = current.page + 1;
      const result = await packsClient.moderationQueue({
        page: nextPage,
        limit: PAGE_SIZE,
      });
      queueQuery.setData((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.items.map((p) => p.id));
        return {
          items: [
            ...prev.items,
            ...result.items.filter((p) => !existingIds.has(p.id)),
          ],
          total: result.total,
          page: nextPage,
        };
      });
      setLoadMoreError("");
    } catch {
      setLoadMoreError("Couldn't load more packs. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  function removePackFromQueue(id: string) {
    queueQuery.setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.filter((p) => p.id !== id),
            total: prev.total - 1,
          }
        : prev,
    );
  }

  async function handleApprove(id: string) {
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      await packsClient.approve(id);
      removePackFromQueue(id);
    } catch {
      setRowError((prev) => ({
        ...prev,
        [id]: "Couldn't approve this pack. Try again.",
      }));
    } finally {
      setRowBusy((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleReject(id: string) {
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      await packsClient.reject(id, rejectReason.trim() || undefined);
      removePackFromQueue(id);
      setRejectingId(null);
      setRejectReason("");
    } catch {
      setRowError((prev) => ({
        ...prev,
        [id]: "Couldn't reject this pack. Try again.",
      }));
    } finally {
      setRowBusy((prev) => ({ ...prev, [id]: false }));
    }
  }

  function toggleReject(id: string) {
    setRejectingId((prev) => (prev === id ? null : id));
    setRejectReason("");
  }

  function cancelReject() {
    setRejectingId(null);
  }

  return {
    packs: queueQuery.data?.items ?? [],
    total: queueQuery.data?.total ?? 0,
    hasData: queueQuery.data != null,
    loading: queueQuery.loading,
    error: queueQuery.error,
    loadingMore,
    loadMoreError,
    rowBusy,
    rowError,
    rejectingId,
    rejectReason,
    setRejectReason,
    toggleReject,
    cancelReject,
    handleLoadMore,
    handleApprove,
    handleReject,
  };
}
