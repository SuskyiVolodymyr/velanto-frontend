"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { PencilLine } from "lucide-react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { formatLabel } from "@/src/shared/lib/pack-display";
import { formatDateTime } from "@/src/shared/lib/format-date";
import { cn } from "@/src/shared/lib/cn";
import { pageContainer } from "@/src/shared/lib/page-container";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { CoverImage } from "@/src/shared/components/CoverImage";
import { LoadingState } from "@/src/shared/components/LoadingState";
import type { ChangeRequestMark, Pack } from "@/src/shared/types/pack";

/** The three numbered steps in "What happens next". */
const NEXT_STEPS = ["1", "2", "3"] as const;

/**
 * Where a mark's subject lives, for the "Pool: …" line under an item mark.
 * Resolved from the pack rather than stored on the mark: the pool a marked item
 * sits in is the author's own current structure, and it is what helps them find
 * the thing again.
 */
function poolNameFor(pack: Pack, mark: ChangeRequestMark): string | null {
  if (mark.kind !== "item") return null;
  const pool = pack.groups.find((group) =>
    group.items.some((item) => item.id === mark.id),
  );
  return pool?.name ?? null;
}

function MarkCard({ pack, mark }: { pack: Pack; mark: ChangeRequestMark }) {
  const t = useTranslations("reviewOutcome");
  const tMod = useTranslations("moderation");
  const pool = poolNameFor(pack, mark);

  return (
    <li className="flex flex-col gap-2.5 rounded-tile border border-status-pending/30 bg-surface-card p-3.5">
      <div className="flex items-center gap-2">
        <Text
          data-mono
          variant="tertiary"
          className="text-[10px] font-bold uppercase tracking-[0.06em]"
        >
          {tMod(`markKind.${mark.kind}`)}
        </Text>
        <span className="ms-auto rounded-[6px] bg-status-pending/[0.16] px-2 py-0.5 text-[10px] font-bold text-status-pending">
          {t("needsEdit")}
        </span>
      </div>
      <Text className="text-[13.5px] font-semibold leading-[1.4] text-pretty">
        {mark.label || tMod(`markKind.${mark.kind}`)}
      </Text>
      {/* A mark with no note still says "this one", which is often all a broken
          link needs — so the Do-this block only appears when there is one. */}
      {(mark.request || pool) && (
        <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2.5">
          {mark.request && (
            <>
              <Text
                className="text-[11px] font-bold uppercase tracking-[0.06em] text-status-pending"
                as="span"
              >
                {t("doThis")}
              </Text>
              <Text
                variant="secondary"
                className="text-[12.5px] leading-[1.5] text-pretty"
              >
                {mark.request}
              </Text>
            </>
          )}
          {pool && (
            <Text variant="tertiary" className="text-[11.5px]">
              {t("inPool", { pool })}
            </Text>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * What the moderator asked an author to change, on the author's own side —
 * `Pack Review Outcome.dc.html`.
 *
 * The change request already travels on the pack, but only the moderator's
 * screen could read it: the author got a notification saying something was
 * wrong and an editor with no indication of WHAT. This is the page that
 * notification and the pack's own banner now point at.
 *
 * Author-only, and only while the pack is actually in `changes_requested` —
 * once they re-submit, the request is cleared server-side and this page has
 * nothing to say, so it sends them to the pack instead of showing an empty
 * shell.
 */
export function PackReviewOutcomeScreen({ packId }: { packId: string }) {
  const t = useTranslations("reviewOutcome");
  const tShell = useTranslations("shell");
  const router = useRouter();
  const { user, status: authStatus } = useAuth();

  const packQuery = useQuery({
    queryKey: ["pack-review-outcome", packId] as const,
    queryFn: () => packsClient.getById(packId),
    enabled: authStatus === "authenticated",
  });
  const pack = packQuery.data;

  const isAuthor = Boolean(user && pack && pack.authorId === user.id);
  const hasRequest = Boolean(pack?.changeRequest);

  useEffect(() => {
    // Someone else's pack, or a pack with nothing outstanding: there is no
    // outcome to read, so hand them back to the pack itself rather than
    // leaving them on a page about a review that isn't theirs / isn't open.
    if (pack && (!isAuthor || !hasRequest)) router.replace(`/packs/${packId}`);
  }, [pack, isAuthor, hasRequest, packId, router]);

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <>
        <PageHeader
          back={{ href: "/my-packs", label: tShell("nav.myPacks") }}
        />
        <div className={cn(pageContainer(1100), "py-16 text-center")}>
          <Text variant="secondary">{t("loginRequired")}</Text>
        </div>
      </>
    );
  }

  if (packQuery.isLoading) {
    return (
      <>
        <PageHeader
          back={{ href: "/my-packs", label: tShell("nav.myPacks") }}
        />
        <div className={cn(pageContainer(1100), "py-16")}>
          <LoadingState label={t("loading")} showLabel />
        </div>
      </>
    );
  }

  if (packQuery.isError || !pack) {
    return (
      <>
        <PageHeader
          back={{ href: "/my-packs", label: tShell("nav.myPacks") }}
        />
        <div className={cn(pageContainer(1100), "py-16 text-center")}>
          <Text variant="danger">{t("notFound")}</Text>
        </div>
      </>
    );
  }

  // The redirect above is already in flight; render nothing rather than a
  // flash of a page that is about to be replaced.
  if (!isAuthor || !pack.changeRequest) return null;

  const request = pack.changeRequest;

  return (
    <>
      <PageHeader
        back={{ href: "/my-packs", label: tShell("nav.myPacks") }}
        crumb={t("crumb")}
      />
      <main
        className={cn(
          pageContainer(1100),
          "flex flex-1 flex-col gap-5 pt-[26px] pb-[70px]",
        )}
      >
        <section className="relative flex flex-col gap-3.5 overflow-hidden rounded-[20px] border border-status-pending/25 bg-status-pending/[0.04] p-6">
          {/* The mock's corner glow. Decorative and inert. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-[90px] -right-[70px] h-[280px] w-[280px] rounded-full bg-status-pending/20 blur-[70px]"
          />
          <div className="relative flex flex-wrap items-center gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-[13px] bg-status-pending/[0.16] text-status-pending">
              <PencilLine size={20} strokeWidth={2.1} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <Text as="h1" variant="title" className="text-[22px] text-pretty">
                {t("heroTitle")}
              </Text>
              <Text variant="tertiary" className="text-[12.5px]">
                {t("heroWhen", { date: formatDateTime(request.requestedAt) })}
              </Text>
            </div>
            <span className="ms-auto">
              <StatusBadge kind="pack" status={pack.status} />
            </span>
          </div>
          <Text
            variant="secondary"
            className="relative max-w-[72ch] text-[14.5px] leading-[1.6] text-pretty"
          >
            {t("heroBody")}
          </Text>
          <div className="relative flex flex-wrap gap-2.5 pt-1">
            <Link
              href={`/packs/${pack.id}/edit`}
              className="flex h-11 items-center rounded-control bg-acc px-[18px] text-sm font-[650] text-[#07131a] transition-[filter] hover:brightness-110"
            >
              {t("openEditor")}
            </Link>
            <Link
              href={`/packs/${pack.id}`}
              className="flex h-11 items-center rounded-control border border-border bg-white/[0.05] px-[18px] text-sm font-[650] text-foreground transition-colors hover:bg-white/[0.09]"
            >
              {t("viewPack")}
            </Link>
          </div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <section className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface-card p-5">
              <Text as="h2" className="text-sm font-bold">
                {t("moderatorSaid")}
              </Text>
              <blockquote className="rounded-[13px] border-s-2 border-status-pending bg-background px-4 py-3.5">
                <Text
                  variant="secondary"
                  className="text-sm leading-[1.6] text-pretty"
                >
                  {request.message}
                </Text>
              </blockquote>
            </section>

            {request.marks.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <Text as="h2" variant="title" className="text-base">
                    {t("marksHeading")}
                  </Text>
                  <Text variant="tertiary" className="text-[12.5px]">
                    {t("marksCount", { count: request.marks.length })}
                  </Text>
                </div>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                  {request.marks.map((mark) => (
                    <MarkCard
                      key={`${mark.kind}:${mark.id}`}
                      pack={pack}
                      mark={mark}
                    />
                  ))}
                </ul>
              </section>
            )}

            <section className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface-card p-5">
              <Text as="h2" className="text-[15px] font-bold">
                {t("nextHeading")}
              </Text>
              <ol className="flex flex-col gap-2.5">
                {NEXT_STEPS.map((step) => (
                  <li key={step} className="flex gap-3">
                    <Text
                      data-mono
                      as="span"
                      variant="tertiary"
                      className="grid h-6 w-6 flex-none place-items-center rounded-chip bg-white/[0.06] text-[11.5px] font-bold"
                    >
                      {step}
                    </Text>
                    <Text
                      variant="secondary"
                      className="text-[13.5px] leading-[1.5] text-pretty"
                    >
                      {t(`step${step}`)}
                    </Text>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="flex flex-col gap-3.5 lg:sticky lg:top-[88px]">
            <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface-card p-[18px]">
              <Text
                as="h2"
                variant="tertiary"
                className="text-[11.5px] font-bold uppercase tracking-[0.1em]"
              >
                {t("thePack")}
              </Text>
              <div
                className="relative aspect-[16/9] w-full overflow-hidden rounded-control border border-border"
                style={{
                  background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
                }}
              >
                {pack.coverImageKey && (
                  <CoverImage coverKey={pack.coverImageKey} />
                )}
              </div>
              <Text className="text-[15px] font-bold text-pretty">
                {pack.title}
              </Text>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-[7px] bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-[650] text-foreground-secondary">
                  {formatLabel(pack.format)}
                </span>
                {pack.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <dl className="flex flex-col gap-2 border-t border-border pt-3">
                <MetaRow
                  label={t("metaPools")}
                  value={String(pack.groups.length)}
                />
                <MetaRow
                  label={t("metaRounds")}
                  value={String(pack.rounds.length)}
                />
                <MetaRow
                  label={t("metaSubmitted")}
                  value={formatDateTime(pack.submittedAt ?? pack.createdAt)}
                />
              </dl>
            </div>

            <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-white/[0.02] px-[18px] py-4">
              <Text className="text-[13px] font-[650]">
                {t("mistakeTitle")}
              </Text>
              <Text
                variant="tertiary"
                className="text-[12.5px] leading-[1.5] text-pretty"
              >
                {t("mistakeBody")}
              </Text>
              <Link
                href="/feedback"
                className="text-[12.5px] font-[650] text-acc hover:underline"
              >
                {t("mistakeLink")}
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <Text as="dt" variant="tertiary" className="text-[12.5px]">
        {label}
      </Text>
      <Text data-mono as="dd" className="text-end text-[12.5px] font-semibold">
        {value}
      </Text>
    </div>
  );
}
