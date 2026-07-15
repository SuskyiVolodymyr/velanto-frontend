"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

// Circular arrow overlay, in the app's control style (surface fill + border
// that strengthens on hover, accent focus ring). Vertically centered on the
// whole card: `top-1/2` of the rail row, which sizes to the (uniform) card
// height, so the arrow sits at the card's middle rather than the cover's.
const arrowButton =
  "absolute top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 cursor-pointer " +
  "items-center justify-center rounded-full border border-border bg-surface/95 " +
  "text-foreground shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur transition " +
  "hover:border-border-strong hover:bg-surface focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background";

/**
 * A horizontally-scrolling row of pack cards under a heading. The native
 * scrollbar is hidden in favour of the app's own arrow controls, which fade in
 * only when there's more to scroll in that direction. When `hasNextPage`, an
 * IntersectionObserver on a trailing sentinel calls `fetchNextPage` as the row
 * nears its end, so the arrows and infinite loading compose.
 *
 * Presentational: the caller owns the query and passes the mapped cards as
 * `children` (so this stays free of any feature import) plus `itemCount` to
 * re-sync the arrows when a new page appends and the scroll width grows.
 */
export function PackScrollRail({
  title,
  itemCount,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  children,
}: {
  title: string;
  itemCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  children: ReactNode;
}) {
  const tCommon = useTranslations("common");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      // Prefetch a little before the sentinel is fully in view so scrolling
      // feels continuous rather than stopping at the edge.
      { rootMargin: "0px 240px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Recompute which arrows apply from the current scroll offset. The 1px slack
  // absorbs sub-pixel rounding at the extremes so an arrow doesn't flicker.
  const syncArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncArrows();
    el.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows);
    return () => {
      el.removeEventListener("scroll", syncArrows);
      window.removeEventListener("resize", syncArrows);
    };
    // itemCount re-syncs once a new page appends (scrollWidth grows).
  }, [syncArrows, itemCount]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  return (
    <section className="mt-10">
      <Text as="h2" variant="title" className="mb-4 text-lg">
        {title}
      </Text>
      <div className="relative">
        <button
          type="button"
          aria-label={tCommon("prev")}
          onClick={() => scrollByPage(-1)}
          className={cn(
            arrowButton,
            "left-2",
            canLeft ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <ChevronLeft size={28} aria-hidden />
        </button>

        <div
          ref={scrollerRef}
          className="no-scrollbar flex snap-x gap-4 overflow-x-auto"
        >
          {children}
          {/* Trailing sentinel: when it scrolls near view, load the next page. */}
          <div ref={sentinelRef} aria-hidden className="w-px shrink-0" />
        </div>

        <button
          type="button"
          aria-label={tCommon("next")}
          onClick={() => scrollByPage(1)}
          className={cn(
            arrowButton,
            "right-2",
            canRight ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <ChevronRight size={28} aria-hidden />
        </button>
      </div>
    </section>
  );
}
