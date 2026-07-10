"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { packsClient } from "@/src/shared/lib/packs-client";
import { FORMAT_LABELS } from "@/src/shared/lib/pack-display";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";

const PAGE_SIZE = 20;

export function ModerationQueueScreen() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const allowed = user?.role === "moderator" || user?.role === "manager" || user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  // useClientData owns the loading/error/abort lifecycle; `page` lives in the
  // fetched data, and approve/reject mutate the cached list via setData.
  const queueQuery = useClientData(
    async () => {
      const result = await packsClient.moderationQueue({ page: 1, limit: PAGE_SIZE });
      return { items: result.items, total: result.total, page: 1 };
    },
    [],
    { enabled: allowed },
  );

  async function handleLoadMore() {
    const current = queueQuery.data;
    if (!current) return;
    setLoadingMore(true);
    try {
      const nextPage = current.page + 1;
      const result = await packsClient.moderationQueue({ page: nextPage, limit: PAGE_SIZE });
      queueQuery.setData((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.items.map((p) => p.id));
        return {
          items: [...prev.items, ...result.items.filter((p) => !existingIds.has(p.id))],
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
      prev ? { ...prev, items: prev.items.filter((p) => p.id !== id), total: prev.total - 1 } : prev,
    );
  }

  async function handleApprove(id: string) {
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      await packsClient.approve(id);
      removePackFromQueue(id);
    } catch {
      setRowError((prev) => ({ ...prev, [id]: "Couldn't approve this pack. Try again." }));
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
      setRowError((prev) => ({ ...prev, [id]: "Couldn't reject this pack. Try again." }));
    } finally {
      setRowBusy((prev) => ({ ...prev, [id]: false }));
    }
  }

  const packs = queueQuery.data?.items ?? [];
  const total = queueQuery.data?.total ?? 0;

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">You need to be logged in to view this page.</Text>
        <Button className="mt-4" onClick={() => router.push(`/auth?next=${encodeURIComponent(pathname)}`)}>
          Log in
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-7 py-10">
      <Text as="h1" variant="title" className="text-3xl">
        Moderation queue
      </Text>

      {queueQuery.loading && <Text variant="secondary">Loading packs…</Text>}
      {queueQuery.error && <Text className="text-[#ff6b6b]">Couldn&apos;t load packs. Try again later.</Text>}
      {queueQuery.data && total === 0 && (
        <Text variant="secondary">No packs waiting for review.</Text>
      )}

      {queueQuery.data && packs.length > 0 && (
        <div className="flex flex-col gap-3">
          {packs.map((pack) => (
            <div key={pack.id} className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-3">
                <Badge>{FORMAT_LABELS[pack.format]}</Badge>
                <Text className="flex-1 truncate font-semibold">{pack.title}</Text>
                <Link href={`/packs/${pack.id}`} className="text-sm text-acc hover:underline">
                  View
                </Link>
                <Button
                  variant="secondary"
                  disabled={rowBusy[pack.id]}
                  onClick={() => void handleApprove(pack.id)}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  disabled={rowBusy[pack.id]}
                  onClick={() => {
                    setRejectingId(rejectingId === pack.id ? null : pack.id);
                    setRejectReason("");
                  }}
                >
                  Reject
                </Button>
              </div>
              <Text variant="secondary" className="line-clamp-2 text-sm">
                {pack.description}
              </Text>
              {rejectingId === pack.id && (
                <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-white/[0.02] p-3">
                  <textarea
                    aria-label="Rejection reason"
                    maxLength={500}
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Reason (optional)"
                    className="min-h-16 rounded-[8px] border border-border bg-transparent p-2 text-sm text-foreground"
                  />
                  <div className="flex gap-2">
                    <Button disabled={rowBusy[pack.id]} onClick={() => void handleReject(pack.id)}>
                      Confirm reject
                    </Button>
                    <Button variant="secondary" onClick={() => setRejectingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {rowError[pack.id] && <Text className="text-sm text-[#ff6b6b]">{rowError[pack.id]}</Text>}
            </div>
          ))}
        </div>
      )}

      {queueQuery.data && packs.length < total && (
        <div className="flex flex-col gap-2">
          <Button variant="secondary" disabled={loadingMore} onClick={() => void handleLoadMore()}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
          {loadMoreError && <Text className="text-sm text-[#ff6b6b]">{loadMoreError}</Text>}
        </div>
      )}
    </main>
  );
}
