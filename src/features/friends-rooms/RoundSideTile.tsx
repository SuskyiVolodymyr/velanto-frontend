"use client";

import { useTranslations } from "next-intl";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { ImageCard } from "@/src/shared/components/ImageCard";
import {
  extractYouTubeId,
  extractYouTubeStart,
} from "@/src/shared/lib/youtube";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { cn } from "@/src/shared/lib/cn";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import type { Item } from "@/src/shared/types/pack";
import type { RoomPlayerState, RoundSide } from "./room-types";

export interface RoundSideTileProps {
  side: RoundSide;
  /** The side's own drawn items, in draw order. */
  items: Item[];
  /** Accessible name for the action — "Pick Side A", "Vote for Side A". */
  actionLabel: string;
  onPick?: () => void;
  /** The viewer's own choice — accent frame, and `aria-pressed` on the card. */
  mine?: boolean;
  /** Leading the tally — a brighter frame without claiming the choice. */
  leading?: boolean;
  /** Live tally under the items. Omit for modes with no public count. */
  tally?: { count: number; max: number };
  /** Guess-who's anonymous labels that picked this side. */
  pickLabels?: { label: string; className: string }[];
  /** Who chose this side, NAMED — the between-round view, where the round is
   * over and there is nothing left to protect. */
  voters?: RoomPlayerState[];
}

/**
 * One SIDE of a versus (nxn) round.
 *
 * nxn is the only format where a choice is not an item: you pick a pool, and the
 * items drawn from it are the matchup context. Both modes nxn offers — Voting
 * and Guess-who — had two option ids they could resolve to nothing, so the board
 * showed raw uuids and then, once tiles required a real item, nothing at all.
 *
 * Distinct from {@link RoundItemTile}, which is one item and is what every
 * other format picks among.
 */
export function RoundSideTile({
  side,
  items,
  actionLabel,
  onPick,
  mine = false,
  leading = false,
  tally,
  pickLabels,
  voters,
}: RoundSideTileProps) {
  const t = useTranslations("room");

  const pct =
    tally && tally.max > 0 ? Math.round((tally.count / tally.max) * 100) : 0;

  const frame = cn(
    "flex w-full flex-col gap-2.5 rounded-[16px] border p-2.5 text-start transition-[transform,border-color] duration-200 ease-signature",
    mine
      ? "border-acc/50 bg-surface-card"
      : leading
        ? "border-border-strong bg-surface-card"
        : "border-border bg-surface-card",
    onPick && "cursor-pointer hover:-translate-y-[3px] hover:border-acc/40",
    !onPick && "cursor-default",
  );

  const content = (
    <>
      {/* One line, fixed: a side whose NAME wraps would push its whole column
          out of step with the other side's, which is the same misalignment the
          titles below cause. */}
      <span className="flex h-6 items-baseline gap-2 px-1">
        <span className="truncate text-[14.5px] font-bold text-foreground">
          {side.name}
        </span>
        <span className="ms-auto text-[11px] font-semibold text-foreground-tertiary">
          {t("board.sideItemCount", { count: items.length })}
        </span>
      </span>

      {/* Each item as its own block — its media and then ITS title. Stacking
          all the media and then all the titles left every name under the last
          video, so a side of three tracks named none of them. */}
      {items.map((item) => {
        const videoId =
          item.type === "youtube" ? extractYouTubeId(item.value) : null;
        const media =
          videoId !== null ? (
            <YouTubeCard
              videoId={videoId}
              startSeconds={extractYouTubeStart(item.value)}
            />
          ) : item.type === "image" ? (
            <ImageCard src={mediaUrl(item.value)} alt={item.title} />
          ) : null;
        return (
          // Its own panel: the title is visibly attached to the video above
          // it. On a side of three tracks a bare stack gave no way to tell
          // which name went with which player.
          <div
            key={item.id}
            className="flex flex-col overflow-hidden rounded-[12px] border border-border bg-background"
          >
            {media && (
              // Swallows the click: the play button inside would otherwise
              // pick the side as well as start the preview.
              //
              // A COLUMN, not a row: as a flex row the player sizes to its
              // content and collapses to nothing, which is exactly how the
              // videos vanished.
              <div
                className="flex flex-col"
                onClick={(event) => event.stopPropagation()}
              >
                {media}
              </div>
            )}
            {/* A fixed two-line box, so every panel is the same height and the
                two sides' videos line up row for row. Left to size itself, a
                one-line title on one side and a two-line title on the other
                pushed the columns out of step for the rest of the card. The
                full name stays on hover, since two lines can clip a long one. */}
            <span
              title={item.title}
              className="line-clamp-2 h-[53px] p-[8px_10px_9px] text-[13px] leading-[1.35] font-semibold text-foreground-secondary"
            >
              {item.title}
            </span>
          </div>
        );
      })}

      {pickLabels && pickLabels.length > 0 && (
        <span className="flex flex-wrap gap-1 px-1">
          {pickLabels.map((pick) => (
            <span
              key={pick.label}
              className={cn(
                "grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-[10.5px] font-extrabold",
                pick.className,
              )}
            >
              {pick.label}
            </span>
          ))}
        </span>
      )}

      {voters && voters.length > 0 && (
        <span className="flex flex-wrap gap-1.5 px-1">
          {voters.map((voter) => (
            <span
              key={voter.userId}
              className="flex items-center gap-1.5 rounded-full border border-border bg-white/[0.04] py-0.5 pe-2 ps-0.5 text-[11.5px] font-semibold text-foreground-secondary"
            >
              <UserAvatar
                username={voter.username}
                avatarKey={voter.avatarKey}
                className="h-[18px] w-[18px] flex-none rounded-full bg-surface-raised text-[8px] font-bold text-foreground"
              />
              {voter.username}
            </span>
          ))}
        </span>
      )}
      {tally && (
        <span className="mt-auto flex items-center gap-2 px-1 pb-0.5">
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
    </>
  );

  // The WHOLE card is the target, media included — a side is one choice, and
  // hunting for the one clickable strip on it is not a game.
  //
  // Deliberately a div with a button role rather than a real <button>: the
  // side's videos render their own play buttons, and a button inside a button
  // is invalid HTML that breaks hydration. That leaves one interactive element
  // nested inside another, a real (if minor) screen-reader wart — the
  // alternative was a card you cannot click, which is worse. Each media block
  // swallows its own clicks, so previewing a track never commits you to the
  // side it belongs to.
  if (onPick) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={mine}
        aria-label={actionLabel}
        onClick={onPick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPick();
          }
        }}
        className={cn(
          frame,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <div role="group" aria-label={side.name} className={frame}>
      {content}
    </div>
  );
}
