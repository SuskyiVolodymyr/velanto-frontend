"use client";

import { useEffect, useMemo, useState } from "react";
import type { Pack, PackTag } from "@/src/shared/types/pack";
import {
  DEFAULT_POPULAR_WINDOW,
  type FormatFilterValue,
  type SortFilterValue,
  type WindowFilterValue,
} from "@/src/features/home/filter-options";
import { usePacksFeed } from "@/src/features/home/api/packs-feed.queries";
import type { PacksFeedFilters } from "@/src/features/home/api/packs-feed";
import {
  readPackFilters,
  writePackFilters,
} from "@/src/features/home/pack-filters-storage";

// Avoids firing a request per keystroke.
const SEARCH_DEBOUNCE_MS = 300;

export type FeedStatus = "loading" | "ready" | "error";

// Owns the home-feed filter state and derives the React Query request from it,
// so HomeFeed stays a thin layout orchestrator and the filter sidebar/results
// stay purely presentational. The fetch itself lives in `usePacksFeed`.
export function useHomeFeed(initialPacks?: Pack[]) {
  const [format, setFormat] = useState<FormatFilterValue>("all");
  const [tags, setTags] = useState<PackTag[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  // Default to Popular / this month so the landing feed leads with what people
  // are actually playing, not the newest upload.
  const [sort, setSort] = useState<SortFilterValue>("popular");
  const [window, setWindow] = useState<WindowFilterValue>(
    DEFAULT_POPULAR_WINDOW,
  );
  const [hydrated, setHydrated] = useState(false);

  // Restore the last-used filters once, after mount rather than during render,
  // so the server-rendered default feed hydrates without a mismatch. The search
  // query is intentionally not persisted (see pack-filters-storage).
  //
  // useHydratedValue doesn't fit here — readPackFilters builds a fresh object
  // each call, which breaks the Object.is-stable-snapshot contract
  // useSyncExternalStore requires (same reasoning as use-result-picks). A
  // narrowly scoped mounted read is the simplest safe shape, so the
  // set-state-in-effect disable is kept deliberately.
  useEffect(() => {
    const stored = readPackFilters();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (stored) {
      setFormat(stored.format);
      setTags(stored.tags);
      setSort(stored.sort);
      setWindow(stored.window);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist filter changes — gated on `hydrated` so the initial defaults never
  // clobber a stored selection before the restore above runs.
  useEffect(() => {
    if (!hydrated) return;
    writePackFilters({ format, tags, sort, window });
  }, [hydrated, format, tags, sort, window]);

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Resolve the UI filter state into the request/query key: the "all" format
  // sentinel and empty search collapse to undefined, and sort/window only apply
  // under the popular sort.
  const filters = useMemo<PacksFeedFilters>(
    () => ({
      format: format === "all" ? undefined : format,
      tags,
      q: query || undefined,
      sort: sort === "popular" ? "popular" : undefined,
      window: sort === "popular" ? window : undefined,
    }),
    [format, tags, query, sort, window],
  );

  // Seed only the default-filters query with the server-rendered feed — other
  // combinations fetch on demand. The default is Popular / DEFAULT_POPULAR_WINDOW
  // (see the sort state above and getHomeFeedServer, which must fetch the same).
  const isDefaultFilters =
    format === "all" &&
    tags.length === 0 &&
    !query &&
    sort === "popular" &&
    window === DEFAULT_POPULAR_WINDOW;
  const feedQuery = usePacksFeed(
    filters,
    isDefaultFilters ? initialPacks : undefined,
  );

  const packs = feedQuery.data ?? [];
  const status: FeedStatus = feedQuery.isError
    ? "error"
    : feedQuery.isLoading
      ? "loading"
      : "ready";

  // Reset to DEFAULT_POPULAR_WINDOW every time Popular is (re)selected, rather
  // than remembering the last-chosen window across a Relevance -> Popular
  // round-trip — that window is the expected starting point each time you opt
  // into popularity sorting.
  function selectSort(value: SortFilterValue) {
    setSort(value);
    if (value === "popular") setWindow(DEFAULT_POPULAR_WINDOW);
  }

  return {
    format,
    setFormat,
    tags,
    setTags,
    searchInput,
    setSearchInput,
    packs,
    status,
    sort,
    selectSort,
    window,
    setWindow,
  };
}
