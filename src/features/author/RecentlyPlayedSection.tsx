"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { PackCard } from "@/src/features/home/PackCard";
import { useRecentlyPlayed } from "./api/recently-played.queries";

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
 * A user's recently-played packs as a horizontally-scrolling row. The native
 * scrollbar is hidden in favor of the app's own arrow controls, which fade in
 * only when there's more to scroll in that direction. The row still appends the
 * next page as it nears the right edge (an IntersectionObserver on a trailing
 * sentinel drives `fetchNextPage`), so the arrows and infinite loading compose.
 *
 * `visible` is the caller's privacy decision — render (and fetch) only when the
 * viewer is allowed to see this history (the profile is public, or the viewer
 * is the owner / staff). When there's nothing to show the whole section
 * collapses, so a fresh account's profile isn't cluttered with an empty rail.
 */
export function RecentlyPlayedSection({
  userId,
  visible,
}: {
  userId: string;
  visible: boolean;
}) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const query = useRecentlyPlayed(userId, visible);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const packs = query.data?.pages.flatMap((page) => page.items) ?? [];

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
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
    // packs.length re-syncs once a new page appends (scrollWidth grows).
  }, [syncArrows, packs.length]);

  if (!visible) return null;
  // Nothing to show (and not still loading the first page) → collapse entirely.
  if (packs.length === 0) return null;

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
        {t("recentlyPlayed")}
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
          {packs.map((pack) => (
            <div key={pack.id} className="w-[280px] shrink-0 snap-start">
              <PackCard pack={pack} />
            </div>
          ))}
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
