"use client";

import { useEffect, useState } from "react";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack, PackFormat, PackTag } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { TagPickerModal } from "@/src/shared/components/TagPickerModal";
import { cn } from "@/src/shared/lib/cn";
import { PackCard } from "@/src/features/home/PackCard";

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

      <div className="flex flex-wrap gap-2">
        {FORMAT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFormat(option.value)}
            aria-pressed={format === option.value}
            className={cn(
              "rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
              format === option.value
                ? "border-acc/30 bg-acc/10 text-acc"
                : "border-border bg-white/[0.03] text-foreground-secondary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setSort(option.value);
              // Reset to the default window every time Popular is (re)selected,
              // rather than remembering the last-chosen window across a
              // Relevance -> Popular round-trip — "week" is the expected
              // starting point each time you opt into popularity sorting.
              if (option.value === "popular") setWindow(DEFAULT_POPULAR_WINDOW);
            }}
            aria-pressed={sort === option.value}
            className={cn(
              "rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
              sort === option.value
                ? "border-acc/30 bg-acc/10 text-acc"
                : "border-border bg-white/[0.03] text-foreground-secondary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {sort === "popular" && (
        <div className="flex flex-wrap gap-2">
          {WINDOW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setWindow(option.value)}
              aria-pressed={window === option.value}
              className={cn(
                "rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
                window === option.value
                  ? "border-acc/30 bg-acc/10 text-acc"
                  : "border-border bg-white/[0.03] text-foreground-secondary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
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

      {status === "loading" && <Text variant="secondary">Loading packs…</Text>}
      {status === "error" && (
        <Text className="text-[#ff6b6b]">Couldn&apos;t load packs. Try again later.</Text>
      )}
      {status === "ready" && packs.length === 0 && (
        <Text variant="secondary">No packs match these filters yet.</Text>
      )}
      {status === "ready" && packs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </div>
  );
}
