"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { PackCard } from "@/src/features/home/PackCard";
import type { Pack } from "@/src/shared/types/pack";
import { useAuthorPacks } from "./api/author-packs.queries";

/**
 * An author's packs as a responsive grid with a "Load more" button that
 * appends the next page (see AUTHOR_PACKS_PAGE_SIZE). Seeded with the first
 * page the caller already has (from the combined author query or SSR), so it
 * renders immediately without a mount fetch. `own` switches the copy and shows
 * moderation status badges — the current user viewing their own packs sees
 * pending/rejected ones; a public visitor sees only approved packs.
 */
export function AuthorPackList({
  authorId,
  initialPacks,
  initialTotal,
  own = false,
}: {
  authorId: string;
  initialPacks: Pack[];
  initialTotal: number;
  own?: boolean;
}) {
  const t = useTranslations("profile");
  const query = useAuthorPacks(authorId, {
    items: initialPacks,
    total: initialTotal,
  });

  const packs = query.data?.pages.flatMap((page) => page.items) ?? initialPacks;
  // react-query derives this from getNextPageParam, so it stays correct even if
  // the server's total shrinks mid-session (a deleted pack), unlike a plain
  // packs.length < total check which could leave an inert button on screen.
  const hasMore = query.hasNextPage;

  return (
    <>
      <Text as="h2" variant="title" className="mb-4 text-lg">
        {own ? t("myPacks") : t("packs")}
      </Text>

      {packs.length === 0 ? (
        <Text variant="secondary">{own ? t("noPacksOwn") : t("noPacks")}</Text>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => (
              <PackCard key={pack.id} pack={pack} showStatus={own} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                variant="secondary"
                loading={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
              </Button>
              {query.isError && (
                <Text variant="danger" className="text-sm">
                  {t("loadMoreError")}
                </Text>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
