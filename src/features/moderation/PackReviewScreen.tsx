"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { formatLabel } from "@/src/shared/lib/pack-display";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { PACK_LANGUAGE_NAMES } from "@/src/shared/types/pack-language";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Username } from "@/src/shared/components/Username";
import { CoverImage } from "@/src/shared/components/CoverImage";
import { PackContentsPreview } from "@/src/features/moderation/PackContentsPreview";
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
  const tProfile = useTranslations("profile");
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
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const actionBusy = approve.isPending || reject.isPending;
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

  function submitReject() {
    if (!pack) return;
    reject.mutate(
      { id: pack.id, reason: rejectReason.trim() },
      { onSuccess: backToQueue },
    );
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

  const author = pack.author;
  const authorProfile = authorQuery.data;

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-7 py-10">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-7">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge kind="pack" status={pack.status} />
              <span className="text-xs font-semibold uppercase text-foreground-secondary">
                {t("packCrumb")}
              </span>
            </div>

            <Text variant="secondary" className="text-sm">
              {t("packSubmittedBy", {
                author: author?.username ?? "—",
                date: formatDateTime(pack.submittedAt ?? pack.createdAt),
              })}
            </Text>

            {(pack.coverImageKey || pack.coverTone) && (
              <div
                className="relative h-[130px] w-full overflow-hidden rounded-[16px] border border-border"
                style={{
                  background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
                }}
              >
                {pack.coverImageKey && (
                  <CoverImage coverKey={pack.coverImageKey} />
                )}
              </div>
            )}

            <Text as="h1" variant="title" className="text-2xl">
              {pack.title}
            </Text>

            {pack.description && (
              <Text
                variant="secondary"
                className="text-[15px] leading-[1.6] text-pretty"
              >
                {pack.description}
              </Text>
            )}

            {pack.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pack.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-foreground-tertiary">
              <span>{formatLabel(pack.format)}</span>
              <span aria-hidden>·</span>
              <span>{PACK_LANGUAGE_NAMES[pack.language]}</span>
            </div>

            <Text variant="tertiary" className="text-[12.5px]">
              {t("packSummarySentence", {
                pools: pack.groups.length,
                rounds: pack.rounds.length,
              })}
            </Text>
          </section>

          <section className="flex items-center gap-3.5 rounded-[16px] border border-border bg-white/[0.02] px-[22px] py-5">
            <UserAvatar
              username={author?.username ?? "?"}
              avatarKey={author?.avatarKey}
              size="lg"
            />
            <div className="min-w-0">
              <Text className="truncate text-[15px] font-semibold">
                <Username
                  username={author?.username ?? "—"}
                  role={author?.role}
                  trusted={author?.trusted}
                  at
                  showRole
                />
              </Text>
              {authorProfile && (
                <Text variant="tertiary" className="mt-0.5 text-xs">
                  {tProfile("followerAndPackCount", {
                    followers: authorProfile.profile.followerCount,
                    packs: authorProfile.packsTotal,
                  })}
                </Text>
              )}
            </div>
          </section>

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

          {pack.rounds.length > 0 && (
            <section className="flex flex-col gap-3">
              <Text
                as="h2"
                variant="tertiary"
                className="text-[12px] font-bold uppercase tracking-[0.14em]"
              >
                {t("roundMappingHeading")}
              </Text>
              <ul className="flex flex-col gap-2">
                {pack.rounds.map((round, index) => {
                  const poolNames = round.slots.map((slot) => {
                    if (slot.groupMode === "random" || !slot.groupId) {
                      return t("roundRandomPool");
                    }
                    return (
                      pack.groups.find((group) => group.id === slot.groupId)
                        ?.name ?? "—"
                    );
                  });
                  const label =
                    round.name?.trim() ||
                    t("roundLabelFallback", { index: index + 1 });
                  return (
                    <li
                      key={round.id}
                      className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-white/[0.02] px-4 py-2.5 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {label}
                      </span>
                      <span className="text-foreground-tertiary">
                        {poolNames.join(" vs ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface-card p-5">
            <Button
              loading={approve.isPending}
              disabled={actionBusy}
              onClick={handleApprove}
            >
              {t("approve")}
            </Button>

            {!showRejectForm ? (
              <Button
                variant="danger"
                disabled={actionBusy}
                onClick={() => setShowRejectForm(true)}
              >
                {t("reject")}
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Input
                  aria-label={t("rejectReasonAria", { title: pack.title })}
                  placeholder={t("rejectPlaceholder")}
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    disabled={actionBusy || rejectReason.trim().length === 0}
                    loading={reject.isPending}
                    onClick={submitReject}
                  >
                    {t("confirmReject")}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={actionBusy}
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason("");
                    }}
                  >
                    {tCommon("cancel")}
                  </Button>
                </div>
              </div>
            )}

            {actionError && (
              <Text variant="danger" className="text-sm">
                {actionError}
              </Text>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
