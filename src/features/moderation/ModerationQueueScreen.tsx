"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { ModerationQueueRow } from "@/src/features/moderation/ModerationQueueRow";
import { useModerationQueue } from "@/src/features/moderation/useModerationQueue";

export function ModerationQueueScreen() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = user?.role === "moderator" || user?.role === "manager" || user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  const queue = useModerationQueue({ enabled: allowed });

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

      {queue.loading && <Text variant="secondary">Loading packs…</Text>}
      {queue.error && <Text className="text-[#ff6b6b]">Couldn&apos;t load packs. Try again later.</Text>}
      {queue.hasData && queue.total === 0 && (
        <Text variant="secondary">No packs waiting for review.</Text>
      )}

      {queue.hasData && queue.packs.length > 0 && (
        <div className="flex flex-col gap-3">
          {queue.packs.map((pack) => (
            <ModerationQueueRow
              key={pack.id}
              pack={pack}
              busy={queue.rowBusy[pack.id]}
              error={queue.rowError[pack.id]}
              rejecting={queue.rejectingId === pack.id}
              rejectReason={queue.rejectReason}
              onApprove={() => void queue.handleApprove(pack.id)}
              onToggleReject={() => queue.toggleReject(pack.id)}
              onReject={() => void queue.handleReject(pack.id)}
              onRejectReasonChange={queue.setRejectReason}
              onCancelReject={queue.cancelReject}
            />
          ))}
        </div>
      )}

      {queue.hasData && queue.packs.length < queue.total && (
        <div className="flex flex-col gap-2">
          <Button variant="secondary" disabled={queue.loadingMore} onClick={() => void queue.handleLoadMore()}>
            {queue.loadingMore ? "Loading…" : "Load more"}
          </Button>
          {queue.loadMoreError && <Text className="text-sm text-[#ff6b6b]">{queue.loadMoreError}</Text>}
        </div>
      )}
    </main>
  );
}
