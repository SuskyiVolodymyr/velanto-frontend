import {
  infiniteQueryOptions,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import type { Pack } from "@/src/shared/types/pack";
import type { PackList } from "@/src/shared/lib/packs-client";
import { AUTHOR_PACKS_PAGE_SIZE, fetchAuthorPacksPage } from "./author-packs";

/**
 * An author's packs as an infinite (append-on-demand) list, keyed by author.
 * `getNextPageParam` stops once every pack is loaded — same shape as the
 * feedback board's list. Default `staleTime` (0): a seed (see
 * {@link useAuthorPacks}) paints instantly, then page 1 refetches on mount so a
 * freshly created/edited/deleted pack shows without a manual invalidation —
 * matching the combined author query's always-fresh-on-mount behavior.
 */
export function authorPacksInfiniteQueryOptions(authorId: string) {
  return infiniteQueryOptions({
    queryKey: ["author-packs", authorId] as const,
    queryFn: ({ pageParam }) => fetchAuthorPacksPage(authorId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (count, page) => count + page.items.length,
        0,
      );
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

/**
 * Infinite author-packs list, optionally seeded with the first page already
 * fetched by the combined author query / SSR. The seed paints instantly (no
 * loading flash, and the server-rendered page stays indexable); page 1 still
 * refetches on mount for freshness (see the options' default staleTime). Omit
 * `seed` to fetch page 1 client-side.
 */
export function useAuthorPacks(
  authorId: string,
  seed?: { items: Pack[]; total: number },
) {
  const initialData: InfiniteData<PackList, number> | undefined = seed
    ? {
        pages: [
          {
            items: seed.items,
            total: seed.total,
            page: 1,
            limit: AUTHOR_PACKS_PAGE_SIZE,
          },
        ],
        pageParams: [1],
      }
    : undefined;

  return useInfiniteQuery({
    ...authorPacksInfiniteQueryOptions(authorId),
    initialData,
  });
}
