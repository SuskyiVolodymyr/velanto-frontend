"use client";

import { SignInGate } from "@/src/shared/components/SignInGate";
import Link from "next/link";
import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PlayIcon, FriendsIcon } from "@/src/shared/components/icons";
import { Badge } from "@/src/shared/components/Badge";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { CoverImage } from "@/src/shared/components/CoverImage";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Username } from "@/src/shared/components/Username";
import { Text } from "@/src/shared/components/Text";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { formatRelativeTimeIntl } from "@/src/shared/lib/relative-time";
import { isHotPack } from "@/src/features/home/hot-pack";
import { useAuth } from "@/src/shared/lib/auth-context";
import { cn } from "@/src/shared/lib/cn";
import { friendsRoomsClient } from "@/src/features/friends-rooms/friends-rooms-client";
import { type PackSummary } from "@/src/shared/types/pack";

/**
 * A pack tile in the browse grid (2.0.0 redesign). The cover + body link to the
 * pack detail page; two actions sit below: solo **Play**, and **Friends**,
 * which creates a room over this pack and routes the host straight in (every
 * format is room-eligible post multiplayer-redesign — see root CLAUDE.md's
 * `save_one_friends was retired` section). Friends reuses the same
 * create-then-push flow as `FriendsRoomEntry` on the pack detail page, just
 * without its join-by-code half — this is a quick-launch shortcut from the
 * grid, not a replacement for the full room entry section.
 *
 * The "HOT" badge is DERIVED from real play counts (see {@link isHotPack}); the
 * per-card likes count is intentionally not shown yet (waits on D3).
 */
export function PackCard({
  pack,
  showStatus,
  playedAt,
}: {
  pack: PackSummary;
  showStatus?: boolean;
  /**
   * ISO timestamp of when the viewer played this pack. Given, the meta line
   * dates the card by the PLAY rather than by publication — the only honest
   * label on a history list, where "3 days ago" must mean "you played it 3
   * days ago", not "it was published 3 days ago".
   */
  playedAt?: string;
}) {
  const tFormat = useTranslations("formats");
  const t = useTranslations("home.card");
  const tRoom = useTranslations("room");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const blocked = user === null;
  // Date the pack by when it went public, not when the row was made — a pack can
  // sit as a draft or wait in moderation. createdAt is the fallback for drafts
  // and legacy packs the backend sends with a null firstPublishedAt.
  const timestamp = playedAt ?? pack.firstPublishedAt ?? pack.createdAt;
  const relativeLabel = formatRelativeTimeIntl(timestamp, locale);
  const firstTag = pack.tags[0];
  const hot = isHotPack(pack);
  const showStatusBadge = showStatus && pack.status !== "approved";

  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createRoomFailed, setCreateRoomFailed] = useState(false);

  async function handleCreateRoom() {
    if (blocked || creatingRoom) return;
    setCreateRoomFailed(false);
    setCreatingRoom(true);
    try {
      const room = await friendsRoomsClient.create(pack.id);
      // Leave `creatingRoom` true: we're navigating away, so the button stays
      // busy rather than flashing back to idle before the route changes.
      router.push(`/rooms/${room.id}`);
    } catch {
      setCreateRoomFailed(true);
      setCreatingRoom(false);
    }
  }

  // Wrap the blocked Friends button in the sign-in tooltip — same anon-gate
  // pattern as FriendsRoomEntry (block + explain, never a surprise redirect).
  const withGate = (node: ReactElement) =>
    blocked ? (
      <SignInGate message={tRoom("entry.signInToPlay")}>{node}</SignInGate>
    ) : (
      node
    );

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-surface-card transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] hover:-translate-y-[3px] hover:border-white/[0.18]">
      <Link href={`/packs/${pack.id}`} className="flex flex-1 flex-col">
        <div
          className="relative isolate aspect-[16/10]"
          style={{
            background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
          }}
        >
          {pack.coverImageKey && (
            <CoverImage coverKey={pack.coverImageKey} className="-z-10" />
          )}
          <div className="absolute inset-0 flex items-start justify-between p-3">
            <Badge variant="overlay">{tFormat(pack.format)}</Badge>
            {showStatusBadge && (
              <StatusBadge kind="pack" status={pack.status} />
            )}
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
            {relativeLabel && (
              <Text
                variant="tertiary"
                className="ms-auto shrink-0 text-[11.5px]"
              >
                <time dateTime={timestamp} suppressHydrationWarning>
                  {playedAt
                    ? t("playedAt", { when: relativeLabel })
                    : relativeLabel}
                </time>
              </Text>
            )}
          </div>
          <Text variant="tertiary" className="text-[11.5px]">
            {t("playsCount", { plays: pack.totalPlays })}
          </Text>
        </div>
      </Link>

      <div className="flex flex-col gap-1.5 px-[14px] pb-[14px]">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          {/* Straight into the play session, not the detail page — a button
              labelled "Play" that lands you on a description with another Play
              button costs a click and reads as a dead end. The card body (cover
              + title) is still the link to the detail page for anyone who wants
              to read about it first. */}
          <Link
            href={`/packs/${pack.id}/play`}
            className="flex h-[38px] w-full items-center justify-center gap-2 rounded-[11px] bg-white/[0.09] text-[13px] font-[650] text-foreground transition-colors hover:bg-acc hover:text-[#07131a]"
          >
            <PlayIcon size={15} />
            {t("play")}
          </Link>
          {withGate(
            <button
              type="button"
              title={t("friendsTitle")}
              aria-disabled={blocked || undefined}
              aria-busy={creatingRoom || undefined}
              onClick={handleCreateRoom}
              className={cn(
                "flex h-[38px] items-center gap-[7px] rounded-[11px] border border-border px-[13px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:border-border-strong hover:bg-white/[0.05] hover:text-foreground",
              )}
            >
              <FriendsIcon />
              {t("friends")}
            </button>,
          )}
        </div>
        {createRoomFailed && (
          <Text variant="danger" className="text-[11.5px]">
            {tRoom("entry.createError")}
          </Text>
        )}
      </div>
    </article>
  );
}
