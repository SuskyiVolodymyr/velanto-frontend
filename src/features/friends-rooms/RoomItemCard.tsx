"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
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

/**
 * Visual state of one item on a room board.
 * - `free`      — nobody has claimed it (round phase). Claimable when `onClaim`.
 * - `claimed`   — someone is sacrificing it right now (round phase).
 * - `sacrificed`— a resolved round's eliminated item (between / results).
 * - `survivor`  — the item nobody claimed (between / results), shown green.
 */
export type RoomItemStatus = "free" | "claimed" | "sacrificed" | "survivor";

interface RoomItemCardProps {
  item: Item;
  index: number;
  status: RoomItemStatus;
  /** The player sacrificing this item (for claimed / sacrificed states). */
  claimant?: RoomPlayerState | null;
  /** The claim belongs to the current viewer — highlight it. */
  isOwn?: boolean;
  /** Briefly flash the card (someone claimed this item just before you did). */
  flash?: boolean;
  /** Present and status `free` ⇒ the card is a claim button. */
  onClaim?: () => void;
}

// Exactly one value per CSS property per state — cn() is a plain join here, not
// tailwind-merge, so a later class never overrides an earlier one (see cn.ts).
const STATUS_FRAME: Record<RoomItemStatus, string> = {
  free: "border-border bg-surface",
  claimed: "border-danger bg-danger/10",
  sacrificed: "border-danger/60 bg-danger/5",
  survivor: "border-success bg-success/10",
};

/**
 * One item on a friends-room board. Renders the same media the play screens use
 * — a real player for a resolvable youtube item ({@link YouTubeCard}), the
 * still-image slot for an image item ({@link ImageCard}), a plain card for text
 * — then layers room state on top: a claimant's avatar rides the top-right
 * corner in red for a sacrifice, the surviving item turns green.
 *
 * A free item in the round is a single claim button. Anything already claimed or
 * resolved is inert (a div), so a taken item can't be clicked.
 */
export function RoomItemCard({
  item,
  index,
  status,
  claimant,
  isOwn = false,
  flash = false,
  onClaim,
}: RoomItemCardProps) {
  const t = useTranslations("room");
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;
  const startSeconds =
    item.type === "youtube" ? extractYouTubeStart(item.value) : null;

  const claimable = status === "free" && Boolean(onClaim);
  const number = String(index + 1).padStart(2, "0");

  const frame = cn(
    "relative w-full overflow-hidden rounded-2xl border text-start transition-colors",
    STATUS_FRAME[status],
    isOwn && "ring-2 ring-acc",
    flash && "room-item-flash",
  );

  const statusLabel =
    status === "survivor"
      ? t("round.survivor")
      : status === "free"
        ? null
        : claimant
          ? t("round.sacrificedBy", { name: claimant.username })
          : t("round.taken");

  const media = videoId ? (
    <YouTubeCard videoId={videoId} startSeconds={startSeconds} />
  ) : item.type === "image" ? (
    <ImageCard src={mediaUrl(item.value)} alt={item.title} />
  ) : null;

  const body = (
    <div className="flex items-center gap-2 p-4">
      {claimant ? (
        <UserAvatar
          username={claimant.username}
          avatarKey={claimant.avatarKey}
          className={cn(
            "h-6 w-6 flex-none rounded-full border text-[11px]",
            status === "survivor"
              ? "border-success text-foreground-secondary"
              : "border-danger text-foreground-secondary",
          )}
        />
      ) : (
        <span aria-hidden className="text-xs font-semibold text-foreground-tertiary">
          {number}
        </span>
      )}
      <Text className="flex-1 font-semibold">{item.title}</Text>
      {statusLabel && (
        <Text
          variant={status === "survivor" ? "body" : "danger"}
          className={cn(
            "text-xs font-medium",
            status === "survivor" && "text-success",
          )}
        >
          {statusLabel}
        </Text>
      )}
    </div>
  );

  const cornerAvatar = claimant && (
    <span
      className={cn(
        "absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border-2",
        status === "survivor" ? "border-success" : "border-danger",
      )}
    >
      <UserAvatar
        username={claimant.username}
        avatarKey={claimant.avatarKey}
        className="h-full w-full rounded-full bg-surface text-xs text-foreground-secondary"
      />
    </span>
  );

  if (claimable) {
    return (
      <button
        type="button"
        onClick={onClaim}
        aria-label={t("round.claim", { name: item.title })}
        className={cn(frame, "hover:border-border-strong")}
      >
        {media}
        {item.type === "youtube" && !videoId && (
          <div className="px-4 pt-4">
            <Badge>YouTube</Badge>
          </div>
        )}
        {body}
      </button>
    );
  }

  return (
    <div className={frame} aria-label={item.title}>
      {cornerAvatar}
      {media}
      {item.type === "youtube" && !videoId && (
        <div className="px-4 pt-4">
          <Badge>YouTube</Badge>
        </div>
      )}
      {body}
    </div>
  );
}
