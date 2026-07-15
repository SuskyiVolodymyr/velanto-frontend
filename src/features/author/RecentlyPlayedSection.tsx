"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { PackCard } from "@/src/features/home/PackCard";
import { useRecentlyPlayed } from "./api/recently-played.queries";

/**
 * A user's recently-played packs as a horizontally-scrolling row that appends
 * the next page as it nears the right edge (an IntersectionObserver on a
 * trailing sentinel drives `fetchNextPage`).
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
  const query = useRecentlyPlayed(userId, visible);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  if (!visible) return null;

  const packs = query.data?.pages.flatMap((page) => page.items) ?? [];
  // Nothing to show (and not still loading the first page) → collapse entirely.
  if (packs.length === 0) return null;

  return (
    <section className="mt-10">
      <Text as="h2" variant="title" className="mb-4 text-lg">
        {t("recentlyPlayed")}
      </Text>
      <div className="flex snap-x gap-4 overflow-x-auto pb-3">
        {packs.map((pack) => (
          <div key={pack.id} className="w-[280px] shrink-0 snap-start">
            <PackCard pack={pack} />
          </div>
        ))}
        {/* Trailing sentinel: when it scrolls near view, load the next page. */}
        <div ref={sentinelRef} aria-hidden className="w-px shrink-0" />
      </div>
    </section>
  );
}
