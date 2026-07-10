"use client";

import { useEffect, useState } from "react";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack, PackFormat, PackTag } from "@/src/shared/types/pack";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { TagPickerModal } from "@/src/shared/components/TagPickerModal";
import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import { HomeFeedResults } from "@/src/features/home/HomeFeedResults";

type FormatFilter = "all" | PackFormat;
type SortFilter = "relevance" | "popular";
type WindowFilter = "day" | "week" | "month" | "year" | "all";

// Backend caps `limit` at 50 — request that in one page since there's no
// pagination UI yet; a real "Page N" control is future work if pack counts
// grow past this.
const PAGE_SIZE = 50;

// Avoids firing a request per keystroke.
const SEARCH_DEBOUNCE_MS = 300;

const FORMAT_OPTIONS: { value: FormatFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "save_one", label: "Save One" },
  { value: "sacrifice_one", label: "Sacrifice One" },
  { value: "nxn", label: "NxN" },
  { value: "rank_blind", label: "Rank Blind" },
  { value: "1v1", label: "1v1" },
];

const SORT_OPTIONS: { value: SortFilter; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "popular", label: "Popular" },
];

const WINDOW_OPTIONS: { value: WindowFilter; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

const DEFAULT_POPULAR_WINDOW: WindowFilter = "week";

export function HomeFeed({ initialPacks }: { initialPacks?: Pack[] }) {
  const [format, setFormat] = useState<FormatFilter>("all");
  const [tags, setTags] = useState<PackTag[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  // Seed from the server-rendered default feed when provided so the landing
  // page has indexable content and doesn't flash a loading state on hydration.
  // The mount effect below still refetches the default query once (filters may
  // differ once the user interacts); seeded content stays visible meanwhile.
  const [packs, setPacks] = useState<Pack[]>(initialPacks ?? []);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    initialPacks ? "ready" : "loading",
  );
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [sort, setSort] = useState<SortFilter>("relevance");
  const [window, setWindow] = useState<WindowFilter>(DEFAULT_POPULAR_WINDOW);

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-sm">
        <Input
          type="search"
          aria-label="Search packs"
          placeholder="Search packs…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      <FilterChipRow options={FORMAT_OPTIONS} value={format} onSelect={setFormat} />

      <FilterChipRow
        options={SORT_OPTIONS}
        value={sort}
        onSelect={(value) => {
          setSort(value);
          // Reset to the default window every time Popular is (re)selected,
          // rather than remembering the last-chosen window across a
          // Relevance -> Popular round-trip — "week" is the expected
          // starting point each time you opt into popularity sorting.
          if (value === "popular") setWindow(DEFAULT_POPULAR_WINDOW);
        }}
      />

      {sort === "popular" && (
        <FilterChipRow options={WINDOW_OPTIONS} value={window} onSelect={setWindow} />
      )}

      <Button
        type="button"
        variant="secondary"
        onClick={() => setTagPickerOpen(true)}
        className="self-start"
      >
        {tags.length === 0 ? "Filter by tags" : `${tags.length} tag${tags.length === 1 ? "" : "s"}`}
      </Button>
      <TagPickerModal
        open={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        selected={tags}
        onChange={setTags}
      />

      <HomeFeedResults status={status} packs={packs} />
    </div>
  );
}
