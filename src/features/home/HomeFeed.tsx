"use client";

import { useHomeFeed } from "@/src/features/home/use-home-feed";
import { HomeFeedResults } from "@/src/features/home/HomeFeedResults";
import { HomeFilterSidebar } from "@/src/features/home/HomeFilterSidebar";
import { HomePagination } from "@/src/features/home/HomePagination";
import type { PacksFeedResult } from "@/src/features/home/api/packs-feed";

export function HomeFeed({ initialFeed }: { initialFeed?: PacksFeedResult }) {
  const feed = useHomeFeed(initialFeed);

  function goToPage(next: number) {
    feed.setPage(next);
    // Paging is a fresh view of the grid — start it at the top, matching the
    // reading position of the first card rather than wherever the pager sat.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Results stay first in the DOM (indexable content); `order` flips the
          filters above them on mobile and to the right on desktop. */}
      <div className="order-2 min-w-0 flex-1 lg:order-1">
        <HomeFeedResults status={feed.status} packs={feed.packs} />
        <HomePagination
          page={feed.page}
          totalPages={feed.totalPages}
          onPageChange={goToPage}
        />
      </div>

      <HomeFilterSidebar
        className="order-1 lg:order-2"
        search={feed.searchInput}
        onSearchChange={feed.setSearchInput}
        format={feed.format}
        onFormatChange={feed.setFormat}
        sort={feed.sort}
        onSortChange={feed.selectSort}
        window={feed.window}
        onWindowChange={feed.setWindow}
        tags={feed.tags}
        onTagsChange={feed.setTags}
      />
    </div>
  );
}
