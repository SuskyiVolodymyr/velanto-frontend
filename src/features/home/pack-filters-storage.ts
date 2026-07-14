import { PACK_TAGS, type PackTag } from "@/src/shared/types/pack";
import {
  DEFAULT_POPULAR_WINDOW,
  FORMAT_FILTER_VALUES,
  SORT_VALUES,
  WINDOW_VALUES,
  type FormatFilterValue,
  type SortFilterValue,
  type WindowFilterValue,
} from "@/src/features/home/filter-options";

const STORAGE_KEY = "velanto:pack-filters";

/**
 * The subset of home-feed filter state persisted across refreshes. The search
 * query is deliberately excluded — it reads as a transient lookup, not a saved
 * preference. See {@link useHomeFeed}.
 */
export interface StoredPackFilters {
  format: FormatFilterValue;
  tags: PackTag[];
  sort: SortFilterValue;
  window: WindowFilterValue;
}

export function writePackFilters(filters: StoredPackFilters): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore: private mode, quota, or a non-browser environment. Persistence is
    // a convenience, never load-bearing.
  }
}

function oneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
  fallback: T,
): T {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Reads the stored filters, sanitizing every field against the current allowed
 * value sets so a stale or hand-edited entry can never feed an invalid filter
 * into the feed request. Returns null only when nothing is stored or the blob
 * is unparseable.
 */
export function readPackFilters(): StoredPackFilters | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<
      Record<keyof StoredPackFilters, unknown>
    >;
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t): t is PackTag =>
          (PACK_TAGS as readonly string[]).includes(t as string),
        )
      : [];
    return {
      format: oneOf(FORMAT_FILTER_VALUES, parsed.format, "all"),
      tags,
      sort: oneOf(SORT_VALUES, parsed.sort, "popular"),
      window: oneOf(WINDOW_VALUES, parsed.window, DEFAULT_POPULAR_WINDOW),
    };
  } catch {
    return null;
  }
}
