"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useClientData } from "@/src/shared/hooks/useClientData";
import type { FeedbackSort, FeedbackStatus, FeedbackTopic } from "@/src/shared/types/feedback";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { cn } from "@/src/shared/lib/cn";
import { FeedbackCard } from "@/src/features/feedback/FeedbackCard";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const TOPIC_FILTERS: { value: FeedbackTopic | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "translation", label: "Translation" },
  { value: "other", label: "Other" },
];

const STATUS_FILTERS: { value: FeedbackStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "declined", label: "Declined" },
];

const SORT_OPTIONS: { value: FeedbackSort; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "new", label: "Newest" },
];

const chipClass = (active: boolean) =>
  cn(
    "rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "border-acc/30 bg-acc/10 text-acc"
      : "border-border bg-white/[0.03] text-foreground-secondary",
  );

export function FeedbackScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<FeedbackTopic | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>(undefined);
  const [sort, setSort] = useState<FeedbackSort>("new");

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");

  // Top-3 sidebar, fetched once on mount. Non-critical — a failed fetch just
  // leaves `data` null, which renders the same "No feedback yet" empty state.
  const top3Query = useClientData(() => feedbackClient.list({ sort: "top", limit: 3 }), []);
  const top3 = top3Query.data?.items ?? [];

  // Debounce the raw search input into `q` (setState lives in the async timeout
  // callback, so it isn't the flagged synchronous set-state-in-effect pattern).
  useEffect(() => {
    const timeout = setTimeout(() => setQ(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Main list, refetched whenever a filter/search/sort changes. `page` is stored
  // in the fetched data so it resets to 1 on every filter-driven refetch.
  const listQuery = useClientData(
    async () => {
      const result = await feedbackClient.list({
        q: q || undefined,
        topic,
        status: statusFilter,
        sort,
        page: 1,
        limit: PAGE_SIZE,
      });
      return { items: result.items, total: result.total, page: 1 };
    },
    [q, topic, statusFilter, sort],
  );

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  async function handleLoadMore() {
    const current = listQuery.data;
    if (!current) return;
    setLoadingMore(true);
    try {
      const nextPage = current.page + 1;
      const result = await feedbackClient.list({
        q: q || undefined,
        topic,
        status: statusFilter,
        sort,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      listQuery.setData((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.items.map((p) => p.id));
        return {
          items: [...prev.items, ...result.items.filter((p) => !existingIds.has(p.id))],
          total: result.total,
          page: nextPage,
        };
      });
      setLoadMoreError("");
    } catch {
      setLoadMoreError("Couldn't load more feedback. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  function handleNewPost() {
    router.push(user ? "/feedback/new" : "/auth?next=/feedback");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-7 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="title" className="text-3xl">
          Feedback
        </Text>
        <Button type="button" onClick={handleNewPost}>
          New post
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="max-w-sm">
            <Input
              type="search"
              aria-label="Search feedback"
              placeholder="Search feedback…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {TOPIC_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setTopic(f.value)}
                aria-pressed={topic === f.value}
                className={chipClass(topic === f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                aria-pressed={statusFilter === f.value}
                className={chipClass(statusFilter === f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                aria-pressed={sort === option.value}
                className={chipClass(sort === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {listQuery.loading && <Text variant="secondary">Loading feedback…</Text>}
          {listQuery.error && (
            <Text className="text-[#ff6b6b]">Couldn&apos;t load feedback. Try again.</Text>
          )}
          {listQuery.data && items.length === 0 && (
            <Text variant="secondary">No feedback matches these filters.</Text>
          )}

          {listQuery.data && items.length > 0 && (
            <div className="flex flex-col gap-2">
              {items.map((post) => (
                <FeedbackCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {listQuery.data && items.length < total && (
            <div className="flex flex-col gap-2">
              <Button variant="secondary" disabled={loadingMore} onClick={() => void handleLoadMore()}>
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
              {loadMoreError && <Text className="text-sm text-[#ff6b6b]">{loadMoreError}</Text>}
            </div>
          )}
        </div>

        <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
          <Text as="h2" variant="title" className="text-lg">
            Top feedback
          </Text>
          {top3.length === 0 ? (
            <Text variant="tertiary" className="text-sm">
              No feedback yet.
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              {top3.map((post) => (
                <FeedbackCard key={post.id} post={post} compact />
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
