"use client";

import { Fragment, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Item } from "@/src/shared/types/pack";
import { cn } from "@/src/shared/lib/cn";
import { mediaUrl } from "@/src/shared/lib/media-url";
import {
  extractYouTubeId,
  youtubeThumbnailUrl,
} from "@/src/shared/lib/youtube";
import { EmptyState } from "@/src/shared/components/EmptyState";

interface GroupItemListProps {
  items: Item[];
  /** Id of the item currently lifted into the form row, if any. */
  editingItemId?: string | null;
  onEdit: (item: Item) => void;
  onRemove: (itemId: string) => void;
  /**
   * Renders the inline edit panel for whichever item matches
   * `editingItemId` (T5) — inserted as its own full-width row right after
   * that item's chip, so the edit panel is anchored at the chip rather than
   * docked in one shared spot at the bottom of the pool.
   */
  renderEditPanel?: (item: Item) => ReactNode;
}

/**
 * Decorative 30×22 preview shown before a youtube/image item's label — the
 * uploaded image itself (via the shared media-key → URL resolver), or a
 * play-triangle overlay on the video's YouTube-hosted thumbnail. Purely
 * cosmetic (aria-hidden throughout); the click-to-edit button around it
 * carries the real accessible name.
 */
function ItemThumbnail({ item }: { item: Item }) {
  if (item.type === "image") {
    const src = mediaUrl(item.value);
    return (
      <span className="relative h-[22px] w-[30px] shrink-0 overflow-hidden rounded-[5px] bg-black/30">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element -- CDN-resolved chip preview; Next <Image> adds no value at this size
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </span>
    );
  }

  const videoId = extractYouTubeId(item.value);
  return (
    <span className="relative h-[22px] w-[30px] shrink-0 overflow-hidden rounded-[5px] bg-black/30">
      {videoId && (
        // eslint-disable-next-line @next/next/no-img-element -- external, per-video thumbnail; not worth a remotePatterns entry for a chip-sized preview
        <img
          src={youtubeThumbnailUrl(videoId)}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* Play-triangle glyph, same border-triangle technique as YouTubeCard. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center"
      >
        <span className="ms-px h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-white" />
      </span>
    </span>
  );
}

/**
 * The chip list of already-added items. Clicking a chip lifts it into the form
 * row for editing; the × removes it outright.
 *
 * The chip being edited stays mounted but is dimmed rather than unmounted, so
 * the row below doesn't jump as the list reflows — and, more importantly, the
 * item is still in the group the whole time, so abandoning an edit can't lose it.
 */
export function GroupItemList({
  items,
  editingItemId,
  onEdit,
  onRemove,
  renderEditPanel,
}: GroupItemListProps) {
  const t = useTranslations("create");
  if (items.length === 0) {
    return <EmptyState title={t("poolEmpty")} />;
  }

  return (
    <ul className="flex flex-wrap gap-[7px]">
      {items.map((item) => {
        const editing = item.id === editingItemId;
        return (
          // A Fragment, not a single wrapping <li> with `display: contents`
          // — that utility drops list semantics from VoiceOver/WebKit (the
          // buttons inside survive, but the list/listitem structure doesn't).
          // The chip stays a real <li>; the edit panel is a second, sibling
          // <li> so `<ul>`/`<li>` semantics are intact either way.
          <Fragment key={item.id}>
            <li
              className={cn(
                "inline-flex items-center gap-2 rounded-chip border px-[9px] py-[5px] text-[13px] transition-colors",
                editing
                  ? "border-acc bg-acc/10 text-foreground-tertiary"
                  : "border-border bg-white/[0.04] text-foreground",
              )}
            >
              <button
                type="button"
                onClick={() => onEdit(item)}
                aria-label={t("editItemAria", { title: item.title })}
                className="flex items-center gap-2 text-start hover:text-acc"
              >
                {(item.type === "image" || item.type === "youtube") && (
                  <ItemThumbnail item={item} />
                )}
                <span className="max-w-[220px] truncate">{item.title}</span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={t("removeItemAria", { title: item.title })}
                // Visual glyph stays 18px to match the chip, but the tap
                // target is widened to the 44px minimum via an invisible
                // pseudo-element (hit-slop) rather than growing the chip
                // itself.
                className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center text-foreground-tertiary before:absolute before:-inset-[13px] before:content-[''] hover:text-danger"
              >
                ×
              </button>
            </li>
            {/* The inline edit panel (T5): anchored right after ITS chip,
                as its own full-width row (`basis-full` forces the parent's
                flex-wrap onto a new line), rather than one shared panel
                docked at the bottom of the pool. `list-none` because this
                <li> is a layout convenience, not a second list entry. */}
            {editing && renderEditPanel && (
              <li className="basis-full list-none">{renderEditPanel(item)}</li>
            )}
          </Fragment>
        );
      })}
    </ul>
  );
}
