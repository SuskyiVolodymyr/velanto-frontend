import type { PackFormat } from "@/src/shared/types/pack";

// Filter value unions for the home feed. "all" is the sentinel meaning "no
// format constraint"; the fetch layer maps it to `undefined`. Human-readable
// labels are resolved from the i18n catalogs at render time (see FormatFilter /
// SortFilter), so only the values live here.
export type FormatFilterValue = "all" | PackFormat;
export type SortFilterValue = "relevance" | "popular";
export type WindowFilterValue = "day" | "week" | "month" | "year" | "all";

export const FORMAT_FILTER_VALUES: FormatFilterValue[] = [
  "all",
  "save_one",
  "sacrifice_one",
  "nxn",
  "rank_blind",
  "1v1",
];

export const SORT_VALUES: SortFilterValue[] = ["relevance", "popular"];

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
