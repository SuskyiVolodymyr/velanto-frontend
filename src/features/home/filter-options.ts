import { PACK_FORMATS, type PackFormat } from "@/src/shared/types/pack";

// Filter value unions for the home feed. "all" is the sentinel meaning "no
// format constraint"; the fetch layer maps it to `undefined`. Human-readable
// labels are resolved from the i18n catalogs at render time (see FormatFilter /
// SortFilter), so only the values live here.
//
// Every format is filterable, including save_one_friends: its cards lead to a
// detail page with a room entry, so a chip is no dead end.
export type FormatFilterValue = "all" | PackFormat;
export type SortFilterValue = "popular" | "date";
export type WindowFilterValue = "day" | "week" | "month" | "year" | "all";
/**
 * Direction of the "date" sort. Kept separate from SortFilterValue so Date is
 * one chip with a newest/oldest sub-row (mirroring how Popular owns the time
 * window), rather than two sibling top-level sorts. The fetch layer flattens
 * `date` + this into the backend's `sort=newest|oldest`.
 */
export type DateOrderValue = "newest" | "oldest";

// DERIVED from PACK_FORMATS rather than hand-listed, so this row can never
// silently drift from the format list again — it was forgotten for rank_blind
// and nearly for 1v1 (docs/superpowers/specs/2026-07-07-1v1-frontend-design.md).
// A hand-written list would NOT have caught that: adding a member to a union
// does not invalidate an array that omits it, so there would be no compile
// error to trip over. Deriving removes the chance entirely — a new format joins
// the feed filter automatically.
export const FORMAT_FILTER_VALUES: FormatFilterValue[] = [
  "all",
  ...PACK_FORMATS,
];

export const SORT_VALUES: SortFilterValue[] = ["popular", "date"];

export const DATE_ORDER_VALUES: DateOrderValue[] = ["newest", "oldest"];

// Maps each sort / date-order value to its key in the `home` message namespace.
export const SORT_LABEL_KEYS: Record<SortFilterValue, string> = {
  popular: "sortPopular",
  date: "sortDate",
};

export const DATE_ORDER_LABEL_KEYS: Record<DateOrderValue, string> = {
  newest: "dateNewest",
  oldest: "dateOldest",
};

export const WINDOW_VALUES: WindowFilterValue[] = [
  "day",
  "week",
  "month",
  "year",
  "all",
];

// Maps each popularity window to its key in the `home` message namespace.
export const WINDOW_LABEL_KEYS: Record<WindowFilterValue, string> = {
  day: "windowDay",
  week: "windowWeek",
  month: "windowMonth",
  year: "windowYear",
  all: "all",
};

// The window the feed starts on (and returns to each time Popular is selected).
// "month" is broad enough to surface a healthy set on a young catalog while
// still meaning "recently popular".
export const DEFAULT_POPULAR_WINDOW: WindowFilterValue = "month";

// The direction the feed starts on (and returns to) each time Date is selected
// — "what's new" is the overwhelmingly common reason to sort by date.
export const DEFAULT_DATE_ORDER: DateOrderValue = "newest";
