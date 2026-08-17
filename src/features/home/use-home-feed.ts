"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { PackTag } from "@/types/pack";
import type { PackLanguage } from "@/types/pack-language";
import {
  DEFAULT_DATE_ORDER,
  DEFAULT_POPULAR_WINDOW,
  type DateOrderValue,
  type FormatFilterValue,
  type SortFilterValue,
  type WindowFilterValue,
} from "@/features/home/filter-options";
import { usePacksFeed } from "@/features/home/api/packs-feed.queries";
import {
  PACKS_FEED_PAGE_SIZE,
  type PacksFeedFilters,
  type PacksFeedResult,
} from "@/features/home/api/packs-feed";
import {
  readPackFilters,
  writePackFilters,
} from "@/features/home/pack-filters-storage";
import { pageFromParam } from "@/features/home/use-page-param";
import {
  hasFilterParams,
  readFiltersFromParams,
  writeFiltersToParams,
} from "@/features/home/feed-filter-params";
import type { StoredPackFilters } from "@/features/home/pack-filters-storage";
import { useSearchQuery } from "@/features/home/search-query-context";

export type FeedStatus = "loading" | "ready" | "error";

// Owns the home-feed filter state and derives the React Query request from it,
// so HomeFeed stays a thin layout orchestrator and the filter sidebar/results
// stay purely presentational. The fetch itself lives in `usePacksFeed`.
//
// The feed owns no text input: the term comes from the global top-bar search
// via SearchQueryProvider, debounced there, so typing re-queries as you go.
// `initialQuery` is the URL's `?q=` as the SERVER rendered it — it seeds the
// first paint (and matches `initialFeed`) until the provider's client-side
// value takes over, so a shared `/?q=…` link still arrives with results.
export function useHomeFeed(initialFeed?: PacksFeedResult, initialQuery = "") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL is the whole filter state (#450). No local copies: a second source
  // of truth is what made the old restore-from-localStorage dance necessary,
  // and what let a reload lose the reader's place.
  const { format, tags, languages, sort, window, dateOrder } = useMemo(
    () => readFiltersFromParams(searchParams),
    [searchParams],
  );
  const page = pageFromParam(searchParams.get("page"));

  const { query: liveQuery, hydrated: searchHydrated } = useSearchQuery();
  // Until the provider has read `?q=` (one tick after mount) its term is
  // empty for a reason we can't act on, so keep the server's — otherwise a
  // shared `/?q=zelda` link would flash the unfiltered feed. After that the
  // provider is authoritative, including when the user CLEARS the box: falling
  // back on emptiness alone would resurrect the old search.
  const query = searchHydrated ? liveQuery : initialQuery;

  const replaceParams = useCallback(
    (params: URLSearchParams) => {
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname],
  );

  /**
   * Apply a filter change. `page` is dropped rather than carried: narrowing the
   * results while deep in the list would otherwise strand the reader on a page
   * the new filter no longer has. Also mirrored to localStorage, which is what
   * seeds a bare `/` on the next visit.
   */
  const applyFilters = useCallback(
    (patch: Partial<StoredPackFilters>) => {
      const current = readFiltersFromParams(searchParams);
      const merged = { ...current, ...patch };
      const params = writeFiltersToParams(searchParams, merged);
      params.delete("page");
      writePackFilters(merged);
      replaceParams(params);
    },
    [searchParams, replaceParams],
  );

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next <= 1) params.delete("page");
      else params.set("page", String(next));
      replaceParams(params);
    },
    [searchParams, replaceParams],
  );

  // Whether a seed is still coming. Decided once, on the first render, and
  // only ever true on the client: on the server there is no localStorage, and
  // `initialData` renders regardless, so first paint is identical either way.
  //
  // This exists to stop the wasted fetch. The SSR seed is deliberately marked
  // stale so mounting always refetches (see packs-feed.queries) — and until the
  // stored filters land a tick later, that refetch asks for the DEFAULT view,
  // whose result is discarded the moment they do. Measured on production: two
  // `/packs` queries per dashboard load for a reader with a saved filter.
  const [seedPending, setSeedPending] = useState(
    () =>
      typeof globalThis.window !== "undefined" &&
      !hasFilterParams(searchParams) &&
      readPackFilters() !== null,
  );

  // Seed a bare `/` from the last-used filters, once. Only when the URL
  // expresses no filter of its own — a link that carries one always wins, so a
  // shared URL means the same thing for whoever opens it.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const stored = hasFilterParams(searchParams) ? null : readPackFilters();
    if (stored) replaceParams(writeFiltersToParams(searchParams, stored));
    // Always released, even when there was nothing to seed or the stored
    // filters were the defaults (which writes no params and so leaves
    // `searchParams` untouched) — otherwise the feed would stay switched off.
    setSeedPending(false);
  }, [searchParams, replaceParams]);

  const setFormat = useCallback(
    (value: FormatFilterValue) => applyFilters({ format: value }),
    [applyFilters],
  );
  const setTags = useCallback(
    (value: PackTag[]) => applyFilters({ tags: value }),
    [applyFilters],
  );
  const setLanguages = useCallback(
    (value: PackLanguage[]) => applyFilters({ languages: value }),
    [applyFilters],
  );
  const setWindow = useCallback(
    (value: WindowFilterValue) => applyFilters({ window: value }),
    [applyFilters],
  );
  const setDateOrder = useCallback(
    (value: DateOrderValue) => applyFilters({ dateOrder: value }),
    [applyFilters],
  );

  // Resolve the UI filter state into the request/query key: the "all" format
  // sentinel and an empty query collapse to undefined; the "date" sort flattens
  // into the backend's newest/oldest wire values; and `window` only rides along
  // under the popular sort.
  const filters = useMemo<PacksFeedFilters>(
    () => ({
      format: format === "all" ? undefined : format,
      tags,
      languages,
      q: query || undefined,
      page,
      sort: sort === "popular" ? "popular" : dateOrder,
      window: sort === "popular" ? window : undefined,
    }),
    [format, tags, languages, query, page, sort, window, dateOrder],
  );

  // Seed only the default-filters query with the server-rendered feed — other
  // combinations fetch on demand. The default is Popular / DEFAULT_POPULAR_WINDOW
  // (see the sort state above and getHomeFeedServer, which must fetch the same).
  // The query is NOT part of this check: getHomeFeedServer fetches the default
  // filters *for this same `q`*, so the seed already matches whatever `q` the
  // URL carried on the first render — only a filter change invalidates it.
  const isDefaultFilters =
    format === "all" &&
    tags.length === 0 &&
    languages.length === 0 &&
    page === 1 &&
    sort === "popular" &&
    window === DEFAULT_POPULAR_WINDOW;
  const feedQuery = usePacksFeed(
    filters,
    isDefaultFilters ? initialFeed : undefined,
    !seedPending,
  );

  const packs = feedQuery.data?.items ?? [];
  const total = feedQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PACKS_FEED_PAGE_SIZE));
  const status: FeedStatus = feedQuery.isError
    ? "error"
    : feedQuery.isLoading
      ? "loading"
      : "ready";

  // Reset the sub-choice every time its parent sort is (re)selected, rather than
  // remembering the last-chosen one across a round-trip through another sort —
  // the default is the expected starting point each time you opt back in.
  function selectSort(value: SortFilterValue) {
    applyFilters({
      sort: value,
      ...(value === "popular"
        ? { window: DEFAULT_POPULAR_WINDOW }
        : { dateOrder: DEFAULT_DATE_ORDER }),
    });
  }

  return {
    format,
    setFormat,
    tags,
    setTags,
    languages,
    setLanguages,
    packs,
    status,
    sort,
    selectSort,
    window,
    setWindow,
    dateOrder,
    setDateOrder,
    page,
    total,
    totalPages,
    setPage,
  };
}
