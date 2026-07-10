import type { PackFormat } from "@/src/shared/types/pack";

// Filter value unions for the home feed. "all" is the sentinel meaning "no
// format constraint"; the fetch layer maps it to `undefined`.
export type FormatFilterValue = "all" | PackFormat;
export type SortFilterValue = "relevance" | "popular";
export type WindowFilterValue = "day" | "week" | "month" | "year" | "all";

export const FORMAT_OPTIONS: { value: FormatFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "save_one", label: "Save One" },
  { value: "sacrifice_one", label: "Sacrifice One" },
  { value: "nxn", label: "NxN" },
  { value: "rank_blind", label: "Rank Blind" },
  { value: "1v1", label: "1v1" },
];

export const SORT_OPTIONS: { value: SortFilterValue; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "popular", label: "Popular" },
];

export const WINDOW_OPTIONS: { value: WindowFilterValue; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

export const DEFAULT_POPULAR_WINDOW: WindowFilterValue = "week";
