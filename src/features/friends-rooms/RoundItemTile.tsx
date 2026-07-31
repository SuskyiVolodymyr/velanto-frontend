"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/src/shared/components/Badge";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { ImageCard } from "@/src/shared/components/ImageCard";
import {
  extractYouTubeId,
  extractYouTubeStart,
} from "@/src/shared/lib/youtube";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { cn } from "@/src/shared/lib/cn";
import type { Item } from "@/src/shared/types/pack";
import type { RoomPlayerState } from "./room-types";

export interface RoundItemTileProps {
  item: Item;
  /** Accessible name for the action — "Vote for X", "Cut X". */
  actionLabel: string;
  onPick?: () => void;
  /** Out of play: dimmed, greyed and struck through (a cut item). */
  spent?: boolean;
  /** The viewer's own pick — accent frame, and `aria-pressed` on the control. */
  mine?: boolean;
  /** Leading the tally — a brighter frame and bar without claiming the pick. */
  leading?: boolean;
  /** Corner badge: "YOUR VOTE", "CUT". */
  badge?: { label: string; tone: "acc" | "danger" };
  /** Live tally under the name. Omit for modes with no public count. */
  tally?: { count: number; max: number };
  /** Who is publicly attached to this item — voters, or the player who cut it. */
  people?: RoomPlayerState[];
  /**
   * How many players picked this, with no clue WHICH — one faceless chip each,
   * in the same corner {@link people} would use. For a blind round, where the
   * count is the only thing that may ever be shown: an avatar or a stable
   * label there would hand over the deduction the whole mode is about.
   */
  maskedPicks?: number;
}

/**
 * One item on a round board (Room Round.dc.html): the media, its name, and
 * whatever the mode makes public about it — a live count, who picked it, or a
 * corner badge.
 *
 * Distinct from {@link RoomItemCard}, which is Claim's own save/sacrifice card
 * and is still what the between-round and results screens render. This one is
 * mode-agnostic: it knows about picks and counts, not about claims.
 */
export function RoundItemTile({
  item,
  actionLabel,
  onPick,
  spent = false,
  mine = false,
  leading = false,
  badge,
  tally,
  people,
  maskedPicks = 0,
}: RoundItemTileProps) {
  const t = useTranslations("room");
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;
  const startSeconds =
    item.type === "youtube" ? extractYouTubeStart(item.value) : null;

  const pct =
    tally && tally.max > 0 ? Math.round((tally.count / tally.max) * 100) : 0;

  const frame = cn(
    "relative flex w-full flex-col overflow-hidden rounded-[16px] border text-start transition-[transform,border-color,opacity] duration-200 ease-signature",
    spent
      ? "border-border opacity-40 grayscale"
      : mine
        ? "border-acc/50 bg-surface-card"
        : leading
          ? "border-border-strong bg-surface-card"
          : "border-border bg-surface-card",
    onPick && !spent && "hover:-translate-y-[3px] hover:border-acc/40",
    !onPick && !spent && "cursor-default",
  );

  const media =
    videoId !== null ? (
      <YouTubeCard videoId={videoId} startSeconds={startSeconds} />
    ) : item.type === "image" ? (
      <ImageCard src={mediaUrl(item.value)} alt={item.title} />
    ) : null;

  const body = (
    <span className="flex flex-col gap-[7px] p-[11px_12px_12px]">
      <span
        className={cn(
          "text-[13.5px] font-semibold",
          spent ? "text-foreground-tertiary line-through" : "text-foreground",
        )}
      >
        {item.title}
      </span>
      {tally && (
        <span className="flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-300 ease-signature motion-reduce:transition-none",
                leading ? "bg-acc" : "bg-white/20",
              )}
              style={{ width: `${pct}%` }}
            />
          </span>
          <span
            className={cn(
              "font-mono text-xs font-bold tabular-nums",
              leading ? "text-acc-hover" : "text-foreground-tertiary",
            )}
          >
            {tally.count}
          </span>
        </span>
      )}
    </span>
  );

  const overlays = (
    <>
      {badge && (
        <span
          className={cn(
            "absolute top-[9px] left-[9px] z-10 rounded-chip px-[9px] py-[3px] text-[10.5px] font-bold tracking-[0.04em]",
            badge.tone === "acc"
              ? "bg-acc text-background"
              : "bg-danger/85 text-background",
          )}
        >
          {badge.label}
        </span>
      )}
      {maskedPicks > 0 && (
        <span
          role="img"
          aria-label={t("guessWho.pickedByCount", { count: maskedPicks })}
          className="absolute top-[9px] right-[9px] z-10 flex"
        >
          {Array.from({ length: maskedPicks }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="-ms-[7px] grid h-6 w-6 place-items-center rounded-full border-2 border-surface-card bg-surface-raised text-[10px] font-bold text-foreground-tertiary"
            >
              ?
            </span>
          ))}
        </span>
      )}
      {people && people.length > 0 && (
        <span className="absolute top-[9px] right-[9px] z-10 flex">
          {people.map((person) => (
            <UserAvatar
              key={person.userId}
              username={person.username}
              avatarKey={person.avatarKey}
              className="-ms-[7px] h-6 w-6 rounded-full border-2 border-surface-card bg-surface-raised text-[9px] font-bold text-foreground"
            />
          ))}
        </span>
      )}
      {/* An unresolvable youtube link has no player to render, so say what the
          item is rather than showing a bare title. */}
      {item.type === "youtube" && videoId === null && (
        <span className="px-3 pt-3">
          <Badge>YouTube</Badge>
        </span>
      )}
    </>
  );

  // A resolvable youtube item renders YouTubeCard's own play button. Wrapping
  // the whole tile in a <button> would nest one inside another — invalid HTML
  // that breaks hydration — so the media sits as a sibling and only the body
  // carries the action, exactly as RoomItemCard does.
  if (onPick && !spent && videoId !== null) {
    return (
      <div className={frame}>
        {overlays}
        {media}
        <button
          type="button"
          onClick={onPick}
          aria-pressed={mine}
          aria-label={actionLabel}
          className="w-full text-start"
        >
          {body}
        </button>
      </div>
    );
  }

  if (onPick && !spent) {
    return (
      <button
        type="button"
        onClick={onPick}
        aria-pressed={mine}
        aria-label={actionLabel}
        className={frame}
      >
        {overlays}
        {media}
        {body}
      </button>
    );
  }

  return (
    // Named even when inert: an un-pickable tile still carries state worth
    // reading (your locked-in pick, an item out of play), and without a name
    // there is nothing for a screen reader — or a test — to address it by.
    <div
      role="group"
      aria-label={
        spent ? `${item.title} — ${t("board.outOfPlay")}` : item.title
      }
      className={frame}
    >
      {overlays}
      {media}
      {body}
    </div>
  );
}
