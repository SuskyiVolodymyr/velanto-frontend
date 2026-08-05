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
import type { Item, Pack } from "@/src/shared/types/pack";
import { claimVerb, outcomeVerb } from "./room-mode-copy";
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
  /** save_one or sacrifice_one — picks the "Save"/"Sacrifice" verb pair. */
  format: Extract<Pack["format"], "save_one" | "sacrifice_one">;
}

// Exactly one value per CSS property per state — cn() is a plain join here, not
// tailwind-merge, so a later class never overrides an earlier one (see cn.ts).
// Two palettes, picked by what the odd one out MEANS in this format. `good` is
// the outcome to celebrate (green), `bad` the one to warn about (red).
const STATUS_FRAME: Record<"good" | "bad", Record<RoomItemStatus, string>> = {
  good: {
    free: "border-border bg-surface",
    claimed: "border-danger bg-danger/10",
    sacrificed: "border-danger/60 bg-danger/5",
    survivor: "border-success bg-success/10",
  },
  bad: {
    free: "border-border bg-surface",
    claimed: "border-success bg-success/10",
    sacrificed: "border-success/60 bg-success/5",
    survivor: "border-danger bg-danger/10",
  },
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
  format,
}: RoomItemCardProps) {
  const t = useTranslations("room");
  // The odd one out takes the format's own verb, and a claim takes the other
  // one — see outcomeVerb/claimVerb. A sacrifice_one board asks everyone to
  // SAVE one item, and sacrifices the one nobody protected.
  const survivorVerb = outcomeVerb(format);
  const claimedVerb = claimVerb(format);
  // Whether the item singled out at the end is the good outcome. It decides the
  // colours as well as the words: painting the odd one out green on a
  // sacrifice_one board would celebrate the item that just got sacrificed.
  const oddOneOutIsGood = survivorVerb === "Save";
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;
  const startSeconds =
    item.type === "youtube" ? extractYouTubeStart(item.value) : null;

  const claimable = status === "free" && Boolean(onClaim);
  const number = String(index + 1).padStart(2, "0");

  // A column, so the body can take the slack when the grid stretches this card
  // to match a taller neighbour — otherwise the strip below a short title is
  // dead space inside a card that reads as clickable everywhere.
  const frame = cn(
    "relative flex w-full flex-col overflow-hidden rounded-2xl border text-start transition-colors",
    STATUS_FRAME[oddOneOutIsGood ? "good" : "bad"][status],
    isOwn && "ring-2 ring-acc",
    flash && "room-item-flash",
  );

  const statusLabel =
    status === "survivor"
      ? t(`round.survivor${survivorVerb}`)
      : status === "free"
        ? null
        : claimant
          ? t(`round.claimedBy${claimedVerb}`, { name: claimant.username })
          : t("round.taken");

  const media = videoId ? (
    <YouTubeCard videoId={videoId} startSeconds={startSeconds} />
  ) : item.type === "image" ? (
    <ImageCard src={mediaUrl(item.value)} alt={item.title} />
  ) : null;

  // The corner badge overlays the media, so it only exists when there IS media.
  // Without this split the claimant was drawn twice on a text item — once here
  // and once by the badge, which fell onto this same row for want of anything
  // to sit on.
  const hasMedia = media !== null;

  // The status label gets its own line rather than a column beside the title:
  // sharing the row left a long title a narrow gutter and broke it one word per
  // line, while "Kept by <name>" sat in the space it needed.
  const body = (
    <div className="flex flex-col gap-1.5 p-4">
      <div className="flex items-center gap-2">
        {claimant && !hasMedia ? (
          <UserAvatar
            username={claimant.username}
            avatarKey={claimant.avatarKey}
            className={cn(
              "h-6 w-6 flex-none rounded-full border text-[11px]",
              (status === "survivor") === oddOneOutIsGood
                ? "border-success text-foreground-secondary"
                : "border-danger text-foreground-secondary",
            )}
          />
        ) : (
          <span
            aria-hidden
            className="flex-none text-xs font-semibold text-foreground-tertiary"
          >
            {number}
          </span>
        )}
        <Text className="min-w-0 flex-1 font-semibold">{item.title}</Text>
      </div>
      {statusLabel && (
        <Text
          variant={
            (status === "survivor") === oddOneOutIsGood ? "body" : "danger"
          }
          className={cn(
            "text-xs font-medium",
            (status === "survivor") === oddOneOutIsGood && "text-success",
          )}
        >
          {statusLabel}
        </Text>
      )}
    </div>
  );

  const cornerAvatar = claimant && hasMedia && (
    <span
      className={cn(
        "absolute end-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border-2",
        (status === "survivor") === oddOneOutIsGood
          ? "border-success"
          : "border-danger",
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
    const claimLabel = t(`round.claim${claimedVerb}`, { name: item.title });
    // A resolvable youtube item renders YouTubeCard's OWN play button. Wrapping
    // the whole card in the claim <button> would nest a button inside a button —
    // invalid HTML that breaks hydration. Mirror CandidateCard: the media sits
    // as a plain sibling and the claim action is its own button below it, so the
    // two interactive controls never nest.
    if (videoId) {
      return (
        <div className={cn(frame, "hover:border-border-strong")}>
          {media}
          <button
            type="button"
            onClick={onClaim}
            aria-label={claimLabel}
            className="flex-1 w-full text-start"
          >
            {body}
          </button>
        </div>
      );
    }
    // Image and text items have no nested interactive element, so the whole card
    // stays a single claim button.
    return (
      <button
        type="button"
        onClick={onClaim}
        aria-label={claimLabel}
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
