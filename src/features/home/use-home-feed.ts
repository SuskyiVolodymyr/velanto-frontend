import { useEffect, useState } from "react";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack, PackTag } from "@/src/shared/types/pack";
import {
  DEFAULT_POPULAR_WINDOW,
  type FormatFilterValue,
  type SortFilterValue,
  type WindowFilterValue,
} from "@/src/features/home/filter-options";

// Backend caps `limit` at 50 — request that in one page since there's no
// pagination UI yet; a real "Page N" control is future work if pack counts
// grow past this.
const PAGE_SIZE = 50;

// Avoids firing a request per keystroke.
const SEARCH_DEBOUNCE_MS = 300;

export type FeedStatus = "loading" | "ready" | "error";

// Owns all home-feed filter state and the debounced fetch that reacts to it,
// so HomeFeed stays a thin layout orchestrator and the filter sidebar/child
// components stay purely presentational.
export function useHomeFeed(initialPacks?: Pack[]) {
  const [format, setFormat] = useState<FormatFilterValue>("all");
  const [tags, setTags] = useState<PackTag[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  // Seed from the server-rendered default feed when provided so the landing
  // page has indexable content and doesn't flash a loading state on hydration.
  // The mount effect below still refetches the default query once (filters may
  // differ once the user interacts); seeded content stays visible meanwhile.
  const [packs, setPacks] = useState<Pack[]>(initialPacks ?? []);
  const [status, setStatus] = useState<FeedStatus>(
    initialPacks ? "ready" : "loading",
  );
  const [sort, setSort] = useState<SortFilterValue>("relevance");
  const [window, setWindow] = useState<WindowFilterValue>(
    DEFAULT_POPULAR_WINDOW,
  );

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    packsClient
      .list({
        format: format === "all" ? undefined : format,
        tags,
        q: query || undefined,
        limit: PAGE_SIZE,
        sort: sort === "popular" ? "popular" : undefined,
        window: sort === "popular" ? window : undefined,
      })
      .then((result) => {
        if (cancelled) return;
        setPacks(result.items);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [format, tags, query, sort, window]);

  // Reset to the default window every time Popular is (re)selected, rather than
  // remembering the last-chosen window across a Relevance -> Popular round-trip
  // — "week" is the expected starting point each time you opt into popularity
  // sorting.
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
