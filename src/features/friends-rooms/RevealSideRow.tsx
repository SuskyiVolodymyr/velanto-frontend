"use client";

import { Text } from "@/src/shared/components/Text";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { ImageCard } from "@/src/shared/components/ImageCard";
import {
  extractYouTubeId,
  extractYouTubeStart,
} from "@/src/shared/lib/youtube";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { cn } from "@/src/shared/lib/cn";
import type { Item } from "@/src/shared/types/pack";
import type { RoundSide } from "./room-types";

/**
 * One side of an nxn round on the BETWEEN-round screen, presented the way solo
 * play presents a versus round (`features/play/VersusRound`'s side panel): the
 * pool name as a quiet uppercase label, then the drawn items in an auto-fit
 * grid, each item's title centred directly beneath its own media.
 *
 * Deliberately NOT {@link RoundSideTile}. That component is a PICK TARGET — the
 * whole card is a button, its items sit in bordered sub-panels so you can tell
 * which title belongs to which video while choosing, and it carries a tally and
 * a hover lift. None of that applies once the round is closed, and reshaping it
 * to suit this screen would change the live board nobody asked to change.
 */
export function RevealSideRow({
  side,
  items,
  pickLabels,
}: {
  side: RoundSide;
  /** The side's own drawn items, in draw order. */
  items: Item[];
  /** The anonymous labels that picked this side. */
  pickLabels?: { label: string; className: string }[];
}) {
  return (
    <div
      role="group"
      aria-label={side.name}
      className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-border bg-surface-card p-4"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Text className="truncate text-[11.5px] font-bold uppercase tracking-[0.1em] text-foreground/45">
          {side.name}
        </Text>
        {/* The labels that took this side, pushed to the far end — the one
            thing this screen adds over solo's panel, and the reason to pause
            on it at all. */}
        {pickLabels && pickLabels.length > 0 && (
          <span className="ms-auto flex flex-wrap gap-1">
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
      </div>

      {/* auto-fit rather than a fixed column count: nxn allows up to 8 items a
          side, and 8 equal columns squeeze every tile to a sliver. Below 720px
          (this codebase's established mobile threshold) auto-fit still fits
          2-up at ~110px, too cramped for a video's controls — one column
          instead. `!` is required to beat the inline grid-template-columns. */}
      <div
        className="grid gap-3 max-[720px]:!grid-cols-1"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
      >
        {items.map((item) => (
          <RevealItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

/** Media band + centred caption — solo's item tile, minus the entrance
 * stagger (there is nothing being revealed one-by-one here). */
function RevealItem({ item }: { item: Item }) {
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;

  let media = null;
  if (videoId) {
    // No fixed height: aspect-video needs an auto width to size a matching
    // 16:9 height from.
    media = (
      <YouTubeCard
        videoId={videoId}
        startSeconds={extractYouTubeStart(item.value)}
        className="rounded-[11px]"
      />
    );
  } else if (item.type === "image") {
    media = (
      <ImageCard
        src={mediaUrl(item.value)}
        alt={item.title}
        className="rounded-[11px]"
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-[9px]">
      {media}
      <Text className="text-pretty text-center text-[13.5px] font-[650]">
        {item.title}
      </Text>
    </div>
  );
}
