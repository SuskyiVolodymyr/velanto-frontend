"use client";

import { PackCard } from "@/src/features/home/PackCard";
import { PackScrollRail } from "@/src/shared/components/PackScrollRail";
import { useAuthorPacks } from "./api/author-packs.queries";

/**
 * An author's created packs as a horizontal {@link PackScrollRail} — the rail
 * counterpart to {@link AuthorPackList}'s grid, used where a compact scrolling
 * row fits better (e.g. the admin user-detail page). Fetches page 1 on mount
 * (no SSR seed) and collapses entirely when the author has no packs.
 */
export function AuthorPacksRail({
  authorId,
  title,
}: {
  authorId: string;
  title: string;
}) {
  const query = useAuthorPacks(authorId);
  const packs = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (packs.length === 0) return null;

  return (
    <PackScrollRail
      title={title}
      itemCount={packs.length}
      hasNextPage={query.hasNextPage}
      isFetchingNextPage={query.isFetchingNextPage}
      fetchNextPage={() => void query.fetchNextPage()}
    >
      {packs.map((pack) => (
        <div key={pack.id} className="w-[280px] shrink-0 snap-start">
          <PackCard pack={pack} />
        </div>
      ))}
    </PackScrollRail>
  );
}
