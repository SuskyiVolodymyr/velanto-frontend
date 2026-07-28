"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import type { Item, ItemType, Pack, SlotMode } from "@/src/shared/types/pack";
import { cn } from "@/src/shared/lib/cn";
import { mediaUrl } from "@/src/shared/lib/media-url";
import {
  extractYouTubeId,
  youtubeThumbnailUrl,
} from "@/src/shared/lib/youtube";
import { Text } from "@/src/shared/components/Text";
import { SearchField } from "@/src/shared/components/SearchField";
import { FilterChip } from "@/src/shared/components/FilterChip";
import { EmptyState } from "@/src/shared/components/EmptyState";

const ITEM_TYPES: ItemType[] = ["text", "youtube", "image"];

// Keys into the "moderation" namespace for each type filter chip's label.
const TYPE_FILTER_LABEL_KEY: Record<ItemType, string> = {
  text: "contentsFilterText",
  youtube: "contentsFilterYoutube",
  image: "contentsFilterImage",
};

interface PackContentsPreviewProps {
  pack: Pack;
  /**
   * Narrows rendering to one round's slots (each resolved to its pool) instead
   * of every pool in the pack. Omit for the "whole pack" approval-mode view
   * (Task 6); pass `report.roundIndex` for a round report's narrowed view
   * (Task 7).
   */
  roundIndex?: number;
}

/** One section of the preview: a pool's items, in the order they should render. */
interface Section {
  key: string;
  poolName: string;
  /** Absent in full-pack mode, where a section is just "the pool", not a slot. */
  mode?: SlotMode;
  items: Item[];
  /**
   * Total items in the pool a random slot draws from — independent of the
   * search/type filter, so the "drawn randomly" note stays accurate even
   * while the visible item list is filtered down.
   */
  poolItemCount?: number;
  /**
   * A `groupMode: "random"` slot (`slot.groupId` absent) has its POOL itself
   * chosen fresh at play time from whichever pools aren't pinned elsewhere
   * (`round-sampling.ts::resolveRoundSelections`) — not just its items. That
   * choice is never recorded, so unlike a `random`-mode slot's items (D10,
   * still resolvable via its fixed pool), there is no pool here to show
   * contents for at all. This section renders a `contentsRandomPoolSlot`
   * explanation instead of a false-empty or fabricated pool.
   */
  unresolvedPool?: boolean;
}

/**
 * Builds the pool/slot sections to render. Full-pack mode (`roundIndex`
 * absent) shows every pool as-is. Round-scoped mode resolves only that
 * round's slots: a `manual` slot shows its pinned `itemIds` in order (that
 * *is* exactly what was shown); a `random`-mode slot with a fixed pool shows
 * every item currently in that pool, since there is no per-play record of
 * which items a specific playthrough actually drew (D10) — count-only would
 * misrepresent that as "this is what appeared"; a `groupMode: "random"` slot
 * (no fixed `groupId` at all — the pool itself is chosen at play time, per
 * `round-sampling.ts`) has no pool to show contents for and gets its own
 * `unresolvedPool` section instead of silently vanishing (which would make a
 * round with real content read as having none).
 */
function buildSections(pack: Pack, roundIndex?: number): Section[] {
  if (roundIndex === undefined) {
    return pack.groups.map((group) => ({
      key: group.id,
      poolName: group.name,
      items: group.items,
    }));
  }

  const round = pack.rounds[roundIndex];
  if (!round) return [];

  const sections: Section[] = [];
  round.slots.forEach((slot, index) => {
    const pool = pack.groups.find((group) => group.id === slot.groupId);
    if (!pool) {
      sections.push({
        key: `${round.id}-slot-${index}`,
        poolName: "",
        items: [],
        unresolvedPool: true,
      });
      return;
    }

    if (slot.mode === "manual") {
      const items = (slot.itemIds ?? [])
        .map((itemId) => pool.items.find((item) => item.id === itemId))
        .filter((item): item is Item => Boolean(item));
      sections.push({
        key: `${round.id}-slot-${index}`,
        poolName: pool.name,
        mode: "manual",
        items,
      });
    } else {
      sections.push({
        key: `${round.id}-slot-${index}`,
        poolName: pool.name,
        mode: "random",
        items: pool.items,
        poolItemCount: pool.items.length,
      });
    }
  });
  return sections;
}

/**
 * A leading visual for one item: the uploaded image / YouTube thumbnail for
 * image and youtube items (same treatment as the create-flow's pool chips —
 * see `GroupItemList.tsx`'s `ItemThumbnail` — reproduced here rather than
 * imported since that component is authoring-UI-local and this task's scope
 * is new moderation-only files), or a plain type glyph for text items, which
 * have no thumbnail to show. Decorative pixels are `aria-hidden`; the
 * `role="img"`/`aria-label` on the wrapper carries the real accessible name
 * so a screen reader announces the item's type.
 */
function ItemVisual({ item, typeLabel }: { item: Item; typeLabel: string }) {
  const boxClassName =
    "relative flex h-[34px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-white/[0.05]";

  if (item.type === "image") {
    const src = mediaUrl(item.value);
    return (
      <span role="img" aria-label={typeLabel} className={boxClassName}>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element -- CDN-resolved review preview; Next <Image> adds no value at this size
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

  if (item.type === "youtube") {
    const videoId = extractYouTubeId(item.value);
    return (
      <span role="img" aria-label={typeLabel} className={boxClassName}>
        {videoId && (
          // eslint-disable-next-line @next/next/no-img-element -- external, per-video thumbnail; not worth a remotePatterns entry for a review-grid preview
          <img
            src={youtubeThumbnailUrl(videoId)}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="ms-px h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-white" />
        </span>
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={typeLabel}
      className={cn(boxClassName, "text-foreground-tertiary")}
    >
      <FileText aria-hidden size={16} />
    </span>
  );
}

function matchesFilters(
  item: Item,
  query: string,
  activeTypes: Set<ItemType>,
): boolean {
  if (activeTypes.size > 0 && !activeTypes.has(item.type)) return false;
  if (!query) return true;
  return item.title.toLowerCase().includes(query);
}

export function PackContentsPreview({
  pack,
  roundIndex,
}: PackContentsPreviewProps) {
  const t = useTranslations("moderation");
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<ItemType>>(new Set());

  const sections = useMemo(
    () => buildSections(pack, roundIndex),
    [pack, roundIndex],
  );

  const normalizedQuery = query.trim().toLowerCase();

  function toggleType(type: ItemType) {
    setActiveTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  if (sections.length === 0) {
    return <EmptyState title={t("contentsEmpty")} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("contentsSearchAria")}
          placeholder={t("contentsSearchPlaceholder")}
          className="min-w-[220px] flex-1"
        />
        <div className="flex flex-wrap gap-2">
          {ITEM_TYPES.map((type) => (
            <FilterChip
              key={type}
              label={t(TYPE_FILTER_LABEL_KEY[type])}
              selected={activeTypes.has(type)}
              onToggle={() => toggleType(type)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {sections.map((section) => {
          if (section.unresolvedPool) {
            return (
              <section key={section.key} className="flex flex-col gap-2.5">
                <Text as="h3" variant="title" className="text-base">
                  {t("roundRandomPool")}
                </Text>
                <Text variant="tertiary" className="text-sm">
                  {t("contentsRandomPoolSlot")}
                </Text>
              </section>
            );
          }

          const filteredItems = section.items.filter((item) =>
            matchesFilters(item, normalizedQuery, activeTypes),
          );
          return (
            <section key={section.key} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <Text as="h3" variant="title" className="text-base">
                  {section.poolName}
                </Text>
                {section.mode === "random" && (
                  <Text variant="tertiary" className="text-xs">
                    {t("contentsDrawnRandomly", {
                      count: section.poolItemCount ?? section.items.length,
                    })}
                  </Text>
                )}
              </div>

              {section.items.length === 0 ? (
                <EmptyState title={t("contentsPoolEmpty")} />
              ) : filteredItems.length === 0 ? (
                <Text variant="tertiary" className="text-sm">
                  {t("contentsNoMatches")}
                </Text>
              ) : (
                <ul className="flex flex-wrap gap-2.5">
                  {filteredItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2.5 rounded-chip border border-border bg-white/[0.03] px-2.5 py-1.5"
                    >
                      <ItemVisual
                        item={item}
                        typeLabel={t(`contentsItemType.${item.type}`)}
                      />
                      <span className="max-w-[220px] truncate text-sm text-foreground">
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
