"use client";

import type { Pack } from "@/src/shared/types/pack";
import { useHomeFeed } from "@/src/features/home/use-home-feed";
import { HomeFeedResults } from "@/src/features/home/HomeFeedResults";
import { HomeFilterSidebar } from "@/src/features/home/HomeFilterSidebar";

export function HomeFeed({ initialPacks }: { initialPacks?: Pack[] }) {
  const feed = useHomeFeed(initialPacks);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Results stay first in the DOM (indexable content); `order` flips the
          filters above them on mobile and to the right on desktop. */}
      <div className="order-2 min-w-0 flex-1 lg:order-1">
        <HomeFeedResults status={feed.status} packs={feed.packs} />
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
