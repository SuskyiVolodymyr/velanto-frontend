"use client";

import { useEffect, useState } from "react";
import { packsClient } from "@/src/shared/lib/packs-client";
import { PACK_TAGS } from "@/src/shared/types/pack";
import type { Pack, PackFormat, PackTag } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { cn } from "@/src/shared/lib/cn";
import { PackCard } from "@/src/features/home/PackCard";

type FormatFilter = "all" | PackFormat;

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

export function HomeFeed() {
  const [format, setFormat] = useState<FormatFilter>("all");
  const [tags, setTags] = useState<PackTag[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [packs, setPacks] = useState<Pack[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

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
  }, [format, tags, query]);

  function toggleTag(tag: PackTag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

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
        {PACK_TAGS.map((tag) => {
          const selected = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={selected}
              className={cn(
                "rounded-[9px] border px-3 py-1.5 text-xs font-medium transition-colors",
                selected
                  ? "border-acc/30 bg-acc/10 text-acc"
                  : "border-border bg-white/[0.03] text-foreground-secondary",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>

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
