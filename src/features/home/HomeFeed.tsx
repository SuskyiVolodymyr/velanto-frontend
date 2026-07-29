"use client";

import { useHomeFeed } from "@/src/features/home/use-home-feed";
import { HomeFeedResults } from "@/src/features/home/HomeFeedResults";
import { BrowseFilterBar } from "@/src/features/home/BrowseFilterBar";
import { HomePagination } from "@/src/features/home/HomePagination";
import { PACKS_FEED_PAGE_SIZE } from "@/src/features/home/api/packs-feed";
import type { PacksFeedResult } from "@/src/features/home/api/packs-feed";

export function HomeFeed({
  initialFeed,
  initialQuery,
}: {
  initialFeed?: PacksFeedResult;
  /** Search term from the URL (`/?q=…`), seeded by the top-bar search. */
  initialQuery?: string;
}) {
  const feed = useHomeFeed(initialFeed, initialQuery);

  function goToPage(next: number) {
    feed.setPage(next);
    // Paging is a fresh view of the grid — start it at the top, matching the
    // reading position of the first card rather than wherever the pager sat.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const firstOnPage = (feed.page - 1) * PACKS_FEED_PAGE_SIZE + 1;
  const lastOnPage = Math.min(feed.page * PACKS_FEED_PAGE_SIZE, feed.total);

  return (
    <div id="browse-packs" className="flex flex-col gap-6 scroll-mt-20">
      <BrowseFilterBar
        format={feed.format}
        onFormatChange={feed.setFormat}
        sort={feed.sort}
        onSortChange={feed.selectSort}
        window={feed.window}
        onWindowChange={feed.setWindow}
        dateOrder={feed.dateOrder}
        onDateOrderChange={feed.setDateOrder}
        tags={feed.tags}
        onTagsChange={feed.setTags}
        languages={feed.languages}
        onLanguagesChange={feed.setLanguages}
      />

      <HomeFeedResults status={feed.status} packs={feed.packs} />

      <HomePagination
        page={feed.page}
        totalPages={feed.totalPages}
        onPageChange={goToPage}
        rangeLabel={
          feed.status === "ready" && feed.total > 0
            ? { first: firstOnPage, last: lastOnPage, total: feed.total }
            : undefined
        }
      />
    </div>
  );
}
