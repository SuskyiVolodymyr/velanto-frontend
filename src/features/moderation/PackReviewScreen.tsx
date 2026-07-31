"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { PackContentsPreview } from "@/src/features/moderation/PackContentsPreview";
import { PackReviewSummary } from "@/src/features/moderation/PackReviewSummary";
import { PackReviewAuthorCard } from "@/src/features/moderation/PackReviewAuthorCard";
import { PackRoundMapping } from "@/src/features/moderation/PackRoundMapping";
import { PackReviewSidebar } from "@/src/features/moderation/PackReviewSidebar";
import { PackReviewFields } from "@/src/features/moderation/PackReviewFields";
import { usePackMarks } from "@/src/features/moderation/use-pack-marks";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { usePackAuthor } from "@/src/features/pack/api/pack-author.queries";
import {
  useApprovePack,
  useRejectPack,
  useRequestPackChanges,
} from "@/src/features/moderation/api/moderation.queries";
import { cn } from "@/src/shared/lib/cn";
import { pageContainer } from "@/src/shared/lib/page-container";

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
  const requestChanges = useRequestPackChanges();
  const marks = usePackMarks();
  const actionError =
    approve.isError || reject.isError || requestChanges.isError
      ? t("updatePackError")
      : "";

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

  function handleRequestChanges(message: string) {
    if (!pack) return;
    // Terminal here like approve/reject: the pack is now with its author and
    // has left the queue, so there is nothing further to do on this screen.
    requestChanges.mutate(
      { id: pack.id, message, marks: marks.marks },
      { onSuccess: backToQueue },
    );
  }

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <>
        <PageHeader back={{ href: "/moderation", label: t("queueBack") }} />
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
      </>
    );
  }

  if (!allowed) return null;

  if (packQuery.isLoading) return null;

  if (packQuery.isError || !pack) {
    return (
      <>
        <PageHeader back={{ href: "/moderation", label: t("queueBack") }} />
        <div className="mx-auto max-w-md py-16 text-center">
          <Text variant="danger">{t("packNotFound")}</Text>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={{ href: "/moderation", label: t("queueBack") }}
        crumb={t("packCrumb")}
        meta={
          <span data-mono="1" className="text-xs text-foreground-tertiary/60">
            {packId.slice(0, 8)}
          </span>
        }
      />
      <main
        className={cn(
          pageContainer(1240),
          "flex flex-1 flex-col gap-5 pt-[26px] pb-[70px]",
        )}
      >
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            {/* The mock's approval banner. Its job is to say what this screen
                is FOR: a play only ever draws part of each pool, so the grid
                below — not a playthrough — is the only way every item gets
                looked at before it reaches anyone. */}
            <section className="flex flex-col gap-3 rounded-[18px] border border-status-pending/25 bg-surface-card p-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge kind="pack" status={pack.status} />
                <Text variant="tertiary" className="ms-auto text-[12.5px]">
                  {t("packSubmittedBy", {
                    author: pack.author?.username ?? "—",
                    date: formatDateTime(pack.submittedAt ?? pack.createdAt),
                  })}
                </Text>
              </div>
              <Text as="h1" variant="title" className="text-[23px] text-pretty">
                {t("approvalHeading")}
              </Text>
              <Text
                variant="secondary"
                className="max-w-[70ch] text-[13.5px] leading-[1.55] text-pretty"
              >
                {t("approvalIntro")}
              </Text>
            </section>

            <PackReviewSummary pack={pack} />
            <PackReviewAuthorCard
              author={pack.author}
              authorProfile={authorQuery.data}
            />

            <PackReviewFields pack={pack} marks={marks} />

            <section className="flex flex-col gap-3.5">
              <Text
                as="h2"
                variant="tertiary"
                className="text-[12px] font-bold uppercase tracking-[0.14em]"
              >
                {t("contentsHeading")}
              </Text>
              <PackContentsPreview pack={pack} marks={marks} />
            </section>

            <PackRoundMapping pack={pack} marks={marks} />
          </div>

          <PackReviewSidebar
            packTitle={pack.title}
            approving={approve.isPending}
            rejecting={reject.isPending}
            requesting={requestChanges.isPending}
            actionError={actionError}
            marks={marks}
            onApprove={handleApprove}
            onReject={handleReject}
            onRequestChanges={handleRequestChanges}
          />
        </div>
      </main>
    </>
  );
}
