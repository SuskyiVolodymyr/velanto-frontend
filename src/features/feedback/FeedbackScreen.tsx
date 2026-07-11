"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import type {
  Feedback,
  FeedbackSort,
  FeedbackStatus,
  FeedbackTopic,
} from "@/src/shared/types/feedback";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { FeedbackFilters } from "@/src/features/feedback/FeedbackFilters";
import { FeedbackList } from "@/src/features/feedback/FeedbackList";
import { FeedbackTopSidebar } from "@/src/features/feedback/FeedbackTopSidebar";
import {
  useFeedbackList,
  useTopFeedback,
} from "@/src/features/feedback/api/feedback-list.queries";
import type { FeedbackListFilters } from "@/src/features/feedback/api/feedback-list";

const SEARCH_DEBOUNCE_MS = 300;

export function FeedbackScreen() {
  const t = useTranslations("feedback");
  const { user } = useAuth();
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<FeedbackTopic | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>(
    undefined,
  );
  const [sort, setSort] = useState<FeedbackSort>("new");

  // Debounce the raw search input into `q` (setState in the async timeout
  // callback, so it isn't the flagged synchronous set-state-in-effect pattern).
  useEffect(() => {
    const timeout = setTimeout(
      () => setQ(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Top-3 sidebar, fetched once. Non-critical — a failed fetch just leaves the
  // list empty, which renders the same "No feedback yet" state.
  const top3Query = useTopFeedback();
  const top3 = top3Query.data?.items ?? [];

  const filters = useMemo<FeedbackListFilters>(
    () => ({ q: q || undefined, topic, status: statusFilter, sort }),
    [q, topic, statusFilter, sort],
  );
  const listQuery = useFeedbackList(filters);

  // Flatten the loaded pages, de-duping by id (a page boundary can repeat an
  // item if the underlying list shifted between fetches).
  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: Feedback[] = [];
    for (const page of listQuery.data?.pages ?? []) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          out.push(item);
        }
      }
    }
    return out;
  }, [listQuery.data]);

  const total = listQuery.data?.pages.at(-1)?.total ?? 0;
  const hasData = listQuery.data !== undefined;

  // Gate the list/empty/load-more branches on a settled first page: during a
  // filter-triggered refetch there's no data for the new key yet, so
  // `listReady` is false and the loading state shows instead of stale rows.
  const listReady = hasData && !listQuery.isLoading;

  // First-load failure (no page loaded) vs a load-more failure (first page
  // kept, an extra page failed) are distinguished by whether any data exists —
  // a load-more error keeps the list visible and shows an inline message. Both
  // reset when the filter key changes, so a stale load-more error clears itself.
  const failed = listQuery.isError || listQuery.isFetchNextPageError;
  const firstLoadError = !hasData && failed ? (listQuery.error as Error) : null;
  const loadMoreError = hasData && failed ? t("loadMoreError") : "";

  function handleNewPost() {
    router.push(user ? "/feedback/new" : "/auth?next=/feedback");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-7 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="title" className="text-3xl">
          {t("pageTitle")}
        </Text>
        <Button type="button" onClick={handleNewPost}>
          {t("newPost")}
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <FeedbackFilters
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            topic={topic}
            onTopicChange={setTopic}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sort={sort}
            onSortChange={setSort}
          />

          <FeedbackList
            loading={listQuery.isLoading}
            error={firstLoadError}
            listReady={listReady}
            items={items}
            total={total}
            loadingMore={listQuery.isFetchingNextPage}
            loadMoreError={loadMoreError}
            onLoadMore={() => void listQuery.fetchNextPage()}
          />
        </div>

        <FeedbackTopSidebar posts={top3} />
      </div>
    </main>
  );
}
