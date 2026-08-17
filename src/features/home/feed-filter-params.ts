import { PACK_TAGS } from "@/shared/types/pack";
import { PACK_LANGUAGES } from "@/shared/types/pack-language";
import {
  DATE_ORDER_VALUES,
  DEFAULT_DATE_ORDER,
  DEFAULT_POPULAR_WINDOW,
  FORMAT_FILTER_VALUES,
  SORT_VALUES,
  WINDOW_VALUES,
} from "@/features/home/filter-options";
import type { StoredPackFilters } from "@/features/home/pack-filters-storage";

/**
 * The home feed's filters, encoded in the query string.
 *
 * The URL is the source of truth (velanto-frontend#450): filters were component
 * state restored from localStorage, so a reload or a Back from a pack returned
 * you to the feed but not to what you were looking at, and a link to "NxN packs
 * in Ukrainian, newest first" couldn't be sent to anyone.
 *
 * localStorage is kept, but demoted to a SEED: it only applies when the URL
 * carries no filter of its own (see `useHomeFeed`), so arriving at a bare `/`
 * still lands on what you were last browsing, and every link with a filter in
 * it means the same thing for everyone.
 *
 * Every value is sanitised against the live allowed sets on the way in — a
 * hand-typed or stale `?format=nonsense` must fall back rather than reach the
 * API, which 400s on an unknown value.
 *
 * `q` is NOT here. The top-bar search owns it (SearchQueryProvider) and already
 * writes it to the URL; this module preserves whatever it left.
 */
const PARAM = {
  format: "format",
  tags: "tags",
  languages: "langs",
  sort: "sort",
  window: "window",
  dateOrder: "order",
} as const;

const FILTER_PARAMS: readonly string[] = Object.values(PARAM);

/** True when the URL is expressing at least one filter of its own. */
export function hasFilterParams(params: URLSearchParams): boolean {
  return FILTER_PARAMS.some((key) => params.has(key));
}

function oneOf<T extends string>(
  allowed: readonly T[],
  value: string | null,
  fallback: T,
): T {
  return value !== null && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function list<T extends string>(
  allowed: readonly T[],
  value: string | null,
): T[] {
  if (!value) return [];
  return value
    .split(",")
    .filter((entry): entry is T =>
      (allowed as readonly string[]).includes(entry),
    );
}

/** The filters the URL is asking for, defaults filling in whatever it omits. */
export function readFiltersFromParams(
  params: URLSearchParams,
): StoredPackFilters {
  return {
    format: oneOf(FORMAT_FILTER_VALUES, params.get(PARAM.format), "all"),
    tags: list(PACK_TAGS, params.get(PARAM.tags)),
    languages: list(PACK_LANGUAGES, params.get(PARAM.languages)),
    sort: oneOf(SORT_VALUES, params.get(PARAM.sort), "popular"),
    window: oneOf(
      WINDOW_VALUES,
      params.get(PARAM.window),
      DEFAULT_POPULAR_WINDOW,
    ),
    dateOrder: oneOf(
      DATE_ORDER_VALUES,
      params.get(PARAM.dateOrder),
      DEFAULT_DATE_ORDER,
    ),
  };
}

/**
 * Write `filters` onto a copy of `params`, dropping anything at its default so
 * the URL stays short and a default view reads as a bare `/` rather than a
 * string of redundant parameters. Non-filter params (notably `q` and `page`)
 * are carried through untouched — the caller decides what to do with `page`.
 */
export function writeFiltersToParams(
  params: URLSearchParams,
  filters: StoredPackFilters,
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  const set = (key: string, value: string, isDefault: boolean) => {
    if (isDefault) next.delete(key);
    else next.set(key, value);
  };

  set(PARAM.format, filters.format, filters.format === "all");
  set(PARAM.tags, filters.tags.join(","), filters.tags.length === 0);
  set(
    PARAM.languages,
    filters.languages.join(","),
    filters.languages.length === 0,
  );
  set(PARAM.sort, filters.sort, filters.sort === "popular");
  // The sub-choices only mean anything under their own parent sort, so they're
  // dropped under the other one rather than left as dead weight in the URL.
  set(
    PARAM.window,
    filters.window,
    filters.sort !== "popular" || filters.window === DEFAULT_POPULAR_WINDOW,
  );
  set(
    PARAM.dateOrder,
    filters.dateOrder,
    filters.sort !== "date" || filters.dateOrder === DEFAULT_DATE_ORDER,
  );
  return next;
}
