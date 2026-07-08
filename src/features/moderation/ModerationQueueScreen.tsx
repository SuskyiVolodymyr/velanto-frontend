"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { FORMAT_LABELS } from "@/src/shared/lib/pack-display";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import type { Pack } from "@/src/shared/types/pack";

const PAGE_SIZE = 20;

export function ModerationQueueScreen() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [packs, setPacks] = useState<Pack[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
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

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    packsClient
      .moderationQueue({ page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setPacks(result.items);
        setTotal(result.total);
        setPage(1);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await packsClient.moderationQueue({ page: nextPage, limit: PAGE_SIZE });
      setPacks((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...result.items.filter((p) => !existingIds.has(p.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
      setLoadMoreError("");
    } catch {
      setLoadMoreError("Couldn't load more packs. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleApprove(id: string) {
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      await packsClient.approve(id);
      setPacks((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
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
      setPacks((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
      setRejectingId(null);
      setRejectReason("");
    } catch {
      setRowError((prev) => ({ ...prev, [id]: "Couldn't reject this pack. Try again." }));
    } finally {
      setRowBusy((prev) => ({ ...prev, [id]: false }));
    }
  }

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

      {status === "loading" && <Text variant="secondary">Loading packs…</Text>}
      {status === "error" && <Text className="text-[#ff6b6b]">Couldn&apos;t load packs. Try again later.</Text>}
      {status === "ready" && total === 0 && (
        <Text variant="secondary">No packs waiting for review.</Text>
      )}

      {status === "ready" && packs.length > 0 && (
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

      {status === "ready" && packs.length < total && (
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
