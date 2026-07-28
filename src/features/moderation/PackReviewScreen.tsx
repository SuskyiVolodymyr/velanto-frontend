"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { PackContentsPreview } from "@/src/features/moderation/PackContentsPreview";
import { PackReviewSummary } from "@/src/features/moderation/PackReviewSummary";
import { PackReviewAuthorCard } from "@/src/features/moderation/PackReviewAuthorCard";
import { PackRoundMapping } from "@/src/features/moderation/PackRoundMapping";
import { PackReviewSidebar } from "@/src/features/moderation/PackReviewSidebar";
import { usePackAuthor } from "@/src/features/pack/api/pack-author.queries";
import {
  useApprovePack,
  useRejectPack,
} from "@/src/features/moderation/api/moderation.queries";

/**
 * Query key for a single pack fetched for review. Deliberately its own key
 * (not shared with VoteButtons' "pack-viewer-vote" or PackDetailScreen's
 * server-side fetch) — this is a moderator-only read of a possibly-pending
 * pack, with its own cache lifetime concerns.
 */
function packReviewQueryKey(packId: string) {
  return ["pack-review", packId] as const;
}

export function PackReviewScreen({ packId }: { packId: string }) {
  const t = useTranslations("moderation");
  const tCommon = useTranslations("common");
  const tHeader = useTranslations("header");
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Computed here (ahead of the `authStatus`/`status` early returns below)
  // rather than alongside the JSX, per Rules of Hooks — mirrors
  // ReportDetailScreen's gate exactly.
  const allowed =
    user?.role === "moderator" ||
    user?.role === "manager" ||
    user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  const packQuery = useQuery({
    queryKey: packReviewQueryKey(packId),
    queryFn: () => packsClient.getById(packId),
    enabled: allowed,
  });
  const pack = packQuery.data;

  // Pack carries only the lightweight PackAuthorSummary (id/username/
  // avatarKey/role/trusted) for immediate, flicker-free identity — no
  // follower/pack counts. Those live on the author's public profile, fetched
  // via the same usePackAuthor hook PackCreatorCard/AuthorHoverCard already
  // use elsewhere, unchanged.
  const authorQuery = usePackAuthor(pack?.authorId ?? "", {
    enabled: allowed && Boolean(pack),
  });

  const approve = useApprovePack();
  const reject = useRejectPack();
  const actionError =
    approve.isError || reject.isError ? t("updatePackError") : "";

  // Approve/reject are terminal here (no mark-for-edit, no further action
  // possible on this screen per D7), so success sends the moderator back to
  // the queue they came from rather than leaving them stranded on a review
  // screen for a pack that's no longer pending. The queue itself is kept
  // fresh via useApprovePack/useRejectPack's existing invalidation
  // (moderation.queries.ts), unchanged.
  function backToQueue() {
    router.push("/moderation?tab=packs");
  }

  function handleApprove() {
    if (!pack) return;
    approve.mutate(pack.id, { onSuccess: backToQueue });
  }

  function handleReject(reason: string) {
    if (!pack) return;
    reject.mutate({ id: pack.id, reason }, { onSuccess: backToQueue });
  }

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{tCommon("loginRequired")}</Text>
        <Button
          className="mt-4"
          onClick={() =>
            router.push(`/auth?next=${encodeURIComponent(pathname)}`)
          }
        >
          {tHeader("logIn")}
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  if (packQuery.isLoading) return null;

  if (packQuery.isError || !pack) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="danger">{t("packNotFound")}</Text>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-7 py-10">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-7">
          <PackReviewSummary pack={pack} />
          <PackReviewAuthorCard
            author={pack.author}
            authorProfile={authorQuery.data}
          />

          <section className="flex flex-col gap-3.5">
            <Text
              as="h2"
              variant="tertiary"
              className="text-[12px] font-bold uppercase tracking-[0.14em]"
            >
              {t("contentsHeading")}
            </Text>
            <PackContentsPreview pack={pack} />
          </section>

          <PackRoundMapping pack={pack} />
        </div>

        <PackReviewSidebar
          packTitle={pack.title}
          approving={approve.isPending}
          rejecting={reject.isPending}
          actionError={actionError}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </main>
  );
}
