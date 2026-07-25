"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Play, Users } from "lucide-react";
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { CoverImage } from "@/src/shared/components/CoverImage";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Username } from "@/src/shared/components/Username";
import { Text } from "@/src/shared/components/Text";
import { getRoundsCount } from "@/src/shared/lib/pack-display";
import { formatRelativeTimeIntl } from "@/src/shared/lib/relative-time";
import { isHotPack } from "@/src/features/home/hot-pack";
import { isUiPackFormat, type Pack } from "@/src/shared/types/pack";

/**
 * A pack tile in the browse grid (2.0.0 redesign). The cover + body link to the
 * pack detail page; the format-appropriate primary action sits below as its own
 * control. Exactly one action shows, gated on the format's real capability
 * today: single-player formats get **Play**, and the room-only
 * `save_one_friends` gets **Play with friends** (the mock's "both on every
 * card" is the not-yet-built multiplayer-for-all — see the modes redesign).
 *
 * The "HOT" badge is DERIVED from real play counts (see {@link isHotPack}); the
 * per-card likes count is intentionally not shown yet (waits on D3).
 */
export function PackCard({
  pack,
  showStatus,
}: {
  pack: Pack;
  showStatus?: boolean;
}) {
  const tFormat = useTranslations("formats");
  const t = useTranslations("home.card");
  const locale = useLocale();
  const roundsCount = getRoundsCount(pack);
  // Date the pack by when it went public, not when the row was made — a pack can
  // sit as a draft or wait in moderation. createdAt is the fallback for drafts
  // and legacy packs the backend sends with a null firstPublishedAt.
  const publishedAt = pack.firstPublishedAt ?? pack.createdAt;
  const publishedLabel = formatRelativeTimeIntl(publishedAt, locale);
  const firstTag = pack.tags[0];
  const hot = isHotPack(pack);
  const showStatusBadge = showStatus && pack.status !== "approved";
  const isSolo = isUiPackFormat(pack.format);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-surface-card transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] hover:-translate-y-[3px] hover:border-white/[0.18]">
      <Link href={`/packs/${pack.id}`} className="flex flex-1 flex-col">
        <div
          className="relative isolate aspect-[16/10]"
          style={{ background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)` }}
        >
          {pack.coverImageKey && (
            <CoverImage coverKey={pack.coverImageKey} className="-z-10" />
          )}
          <div className="absolute inset-0 flex items-start justify-between p-3">
            <Badge variant="overlay">{tFormat(pack.format)}</Badge>
            {showStatusBadge && <StatusBadge kind="pack" status={pack.status} />}
          </div>
          {firstTag && (
            <span className="absolute bottom-3 start-3 rounded-[7px] bg-black/50 px-2 py-[3px] text-[11px] font-semibold text-white/80 backdrop-blur-sm">
              {firstTag}
            </span>
          )}
          {hot && (
            <span className="absolute bottom-3 end-3 rounded-[7px] bg-hot/90 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#150912]">
              {t("hot")}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-[7px] p-[14px]">
          <Text as="h3" className="text-[15px] font-[650] leading-snug">
            {pack.title}
          </Text>
          <Text
            variant="secondary"
            className="line-clamp-2 text-[12.5px] leading-[1.45]"
          >
            {pack.description}
          </Text>
          {/* mt-auto pins the author + meta block to the bottom, absorbing the
              slack from a short title/description. */}
          <div className="mt-auto flex items-center gap-[7px] pt-2">
            {pack.author && (
              <>
                <UserAvatar
                  username={pack.author.username}
                  avatarKey={pack.author.avatarKey}
                  size="xs"
                />
                <Username
                  username={pack.author.username}
                  role={pack.author.role}
                  trusted={pack.author.trusted}
                  at
                  className="truncate text-xs text-foreground-secondary"
                />
              </>
            )}
            {/* Relative label is computed from `now`, so server and hydrating
                client can legitimately differ; suppressHydrationWarning keeps the
                server copy on hydration while the exact instant stays in
                `dateTime`. */}
            {publishedLabel && (
              <Text
                variant="tertiary"
                className="ms-auto shrink-0 text-[11.5px]"
              >
                <time dateTime={publishedAt} suppressHydrationWarning>
                  {publishedLabel}
                </time>
              </Text>
            )}
          </div>
          <Text variant="tertiary" className="text-[11.5px]">
            {t("roundsPlays", { rounds: roundsCount, plays: pack.totalPlays })}
          </Text>
        </div>
      </Link>

      <div className="px-[14px] pb-[14px]">
        <Link
          href={`/packs/${pack.id}`}
          className={
            isSolo
              ? "flex h-[38px] w-full items-center justify-center gap-2 rounded-[11px] bg-white/[0.09] text-[13px] font-[650] text-foreground transition-colors hover:bg-acc hover:text-[#07131a]"
              : "flex h-[38px] w-full items-center justify-center gap-2 rounded-[11px] border border-white/[0.12] text-[13px] font-semibold text-foreground-secondary transition-colors hover:border-white/[0.28] hover:bg-white/[0.05] hover:text-foreground"
          }
        >
          {isSolo ? (
            <>
              <Play size={15} strokeWidth={2} fill="currentColor" aria-hidden />
              {t("play")}
            </>
          ) : (
            <>
              <Users size={15} strokeWidth={2} aria-hidden />
              {t("playWithFriends")}
            </>
          )}
        </Link>
      </div>
    </article>
  );
}
