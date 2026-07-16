import { PACK_TAGS, type PackTag } from "@/src/shared/types/pack";
import {
  PACK_LANGUAGES,
  type PackLanguage,
} from "@/src/shared/types/pack-language";
import {
  DATE_ORDER_VALUES,
  DEFAULT_DATE_ORDER,
  DEFAULT_POPULAR_WINDOW,
  FORMAT_FILTER_VALUES,
  SORT_VALUES,
  WINDOW_VALUES,
  type DateOrderValue,
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
  languages: PackLanguage[];
  sort: SortFilterValue;
  window: WindowFilterValue;
  dateOrder: DateOrderValue;
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
    // Sanitized against the live taxonomy for the same reason as tags: a stale
    // blob (or a hand-edited one) must never put an unknown code on the wire —
    // the API 400s on it, which would break the feed for anyone whose stored
    // filters predate a taxonomy change.
    const languages = Array.isArray(parsed.languages)
      ? parsed.languages.filter((l): l is PackLanguage =>
          (PACK_LANGUAGES as readonly string[]).includes(l as string),
        )
      : [];
    return {
      format: oneOf(FORMAT_FILTER_VALUES, parsed.format, "all"),
      tags,
      languages,
      sort: oneOf(SORT_VALUES, parsed.sort, "popular"),
      window: oneOf(WINDOW_VALUES, parsed.window, DEFAULT_POPULAR_WINDOW),
      dateOrder: oneOf(DATE_ORDER_VALUES, parsed.dateOrder, DEFAULT_DATE_ORDER),
    };
  } catch {
    return null;
  }
}
