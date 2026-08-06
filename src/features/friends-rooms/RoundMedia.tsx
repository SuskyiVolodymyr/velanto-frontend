"use client";

import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { ImageCard } from "@/src/shared/components/ImageCard";
import {
  extractYouTubeId,
  extractYouTubeStart,
} from "@/src/shared/lib/youtube";
import { mediaUrl } from "@/src/shared/lib/media-url";
import type { Item } from "@/src/shared/types/pack";

/**
 * An item's media band, and nothing else — the one place a room board turns an
 * `Item` into a picture.
 *
 * Every board had its own copy of this three-way switch, which is why the
 * ranked modes ended up with none: Shared-grid and Relay resolve to an ORDER,
 * so their screens were built as text lists, and a room that had just spent
 * five rounds looking at video came out the other side reading titles.
 *
 * No caption and no frame: the callers disagree about both (a versus row
 * centres a title underneath, a ranking row puts one beside), and they agree
 * about the picture.
 *
 * A text item has no media at all and renders nothing — the caller's title is
 * the whole content in that case.
 */
export function RoundMedia({
  item,
  className,
}: {
  item: Item;
  /** Sizing is the caller's — a ranking row wants a thumbnail, a versus row a
   * full tile. */
  className?: string;
}) {
  if (item.type === "youtube") {
    const videoId = extractYouTubeId(item.value);
    if (!videoId) return null;
    // No fixed height: aspect-video needs an auto width to size a matching
    // 16:9 height from.
    return (
      <YouTubeCard
        videoId={videoId}
        startSeconds={extractYouTubeStart(item.value)}
        className={className}
      />
    );
  }
  if (item.type === "image") {
    return (
      <ImageCard
        src={mediaUrl(item.value)}
        alt={item.title}
        className={className}
      />
    );
  }
  return null;
}
