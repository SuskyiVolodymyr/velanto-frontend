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
  /**
   * How the round ENDED for this option — a settled verdict, not a live lead.
   * Green for the one the room went with, red for the one it dropped.
   *
   * Distinct from {@link leading}, which says "ahead right now" in a round
   * still open and deliberately stays neutral about it. Only a between-round
   * or results board should pass this; on a live board a red frame would read
   * as "this option is out" while people are still choosing it.
   */
  outcome?: "won" | "lost";
  /** Corner badge: "YOUR VOTE", "CUT". */
  badge?: { label: string; tone: "acc" | "danger" };
  /** Live tally under the name. Omit for modes with no public count. */
  tally?: { count: number; max: number };
  /** Who is publicly attached to this item — voters, or the player who cut it. */
  people?: RoomPlayerState[];
  /**
   * Guess-who's anonymous labels that have picked this item — one lettered
   * chip each, under the title. Labels, not names and not a count: a single
   * round attributes nothing (two people often pick the same option), and it is
   * a label's trajectory ACROSS rounds that the mode asks you to read.
   */
  pickLabels?: { label: string; className: string }[];
  /**
   * Who chose this, NAMED — the between-round view, where the round is over and
   * there is nothing left to protect. Distinct from {@link people}, which is
   * the live corner stack of avatars with no names attached.
   */
  voters?: RoomPlayerState[];
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
  outcome,
  badge,
  tally,
  people,
  pickLabels,
  voters,
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
      : // A settled verdict outranks every live treatment below it: once the
        // round is over, "you picked this" and "this was ahead" are both
        // stale, and only won/lost is still true.
        outcome === "won"
        ? "border-success bg-success/[0.06] ring-1 ring-success/35"
        : outcome === "lost"
          ? "border-danger/70 bg-danger/[0.04]"
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
    // `flex-1` so the body takes the card's slack, which is what lets the tally
    // sit on the floor: a row stretches every card to the tallest, and without
    // it a short title left the bar floating mid-card while its neighbours'
    // sat lower. Bars that do not share a baseline cannot be compared, which
    // is the only thing a tally bar is for.
    <span className="flex flex-1 flex-col gap-[7px] p-[11px_12px_12px]">
      <span
        className={cn(
          "text-[13.5px] font-semibold",
          spent ? "text-foreground-tertiary line-through" : "text-foreground",
        )}
      >
        {item.title}
      </span>
      {/* Under the title, not over the media: on a video tile the corner
          overlay sat on the thumbnail — competing with the play button and
          unreadable against a bright frame. */}
      {pickLabels && pickLabels.length > 0 && (
        <span
          aria-label={t("guessWho.pickedByLabels", {
            labels: pickLabels.map((p) => p.label).join(", "),
          })}
          className="flex flex-wrap gap-1"
        >
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
        <span className="flex flex-wrap gap-1.5">
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
        <span className="mt-auto flex items-center gap-2 pt-1">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-300 ease-signature motion-reduce:transition-none",
                outcome === "won"
                  ? "bg-success"
                  : leading
                    ? "bg-acc"
                    : "bg-white/20",
              )}
              style={{ width: `${pct}%` }}
            />
          </span>
          <span
            className={cn(
              "font-mono text-xs font-bold tabular-nums",
              outcome === "won"
                ? "text-success"
                : leading
                  ? "text-acc-hover"
                  : "text-foreground-tertiary",
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
          // Grows with the tile: a row stretches every card to the tallest, so
          // a short title — or one card without the pick chips its neighbours
          // have — leaves a strip under the body that looks clickable and,
          // without this, isn't.
          className="w-full flex-1 text-start"
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
