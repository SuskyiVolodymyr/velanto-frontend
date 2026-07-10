"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useClientData } from "@/src/shared/hooks/useClientData";
import type {
  FeedbackSort,
  FeedbackStatus,
  FeedbackTopic,
} from "@/src/shared/types/feedback";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { FeedbackFilters } from "@/src/features/feedback/FeedbackFilters";
import { FeedbackList } from "@/src/features/feedback/FeedbackList";
import { FeedbackTopSidebar } from "@/src/features/feedback/FeedbackTopSidebar";

const PAGE_SIZE = 20;
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

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");

  // Top-3 sidebar, fetched once on mount. Non-critical — a failed fetch just
  // leaves `data` null, which renders the same "No feedback yet" empty state.
  const top3Query = useClientData(
    () => feedbackClient.list({ sort: "top", limit: 3 }),
    [],
  );
  const top3 = top3Query.data?.items ?? [];

  // Debounce the raw search input into `q` (setState lives in the async timeout
  // callback, so it isn't the flagged synchronous set-state-in-effect pattern).
  useEffect(() => {
    const timeout = setTimeout(
      () => setQ(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Main list, refetched whenever a filter/search/sort changes. `page` is stored
  // in the fetched data so it resets to 1 on every filter-driven refetch.
  const listQuery = useClientData(async () => {
    const result = await feedbackClient.list({
      q: q || undefined,
      topic,
      status: statusFilter,
      sort,
      page: 1,
      limit: PAGE_SIZE,
    });
    return { items: result.items, total: result.total, page: 1 };
  }, [q, topic, statusFilter, sort]);

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  // Gate the list/empty/load-more branches on a *settled* fetch (mirrors
  // NotificationsBell): during a filter-triggered refetch `loading` is true while
  // the previous data is still held, so without this the stale rows flash under
  // the loading text. `listReady` shows the loading state instead.
  const listReady =
    listQuery.data !== null && !listQuery.loading && listQuery.error === null;

  // Reset a stale load-more error whenever the active filter/search/sort changes.
  // Done during render (React's "adjust state on a changed input" pattern) rather
  // than in an effect, keeping clear of the set-state-in-effect rule this file
  // otherwise avoids.
  const filterKey = `${q} ${topic ?? ""} ${statusFilter ?? ""} ${sort}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setLoadMoreError("");
  }

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
          items: [
            ...prev.items,
            ...result.items.filter((p) => !existingIds.has(p.id)),
          ],
          total: result.total,
          page: nextPage,
        };
      });
      setLoadMoreError("");
    } catch {
      setLoadMoreError(t("loadMoreError"));
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
            loading={listQuery.loading}
            error={listQuery.error}
            listReady={listReady}
            items={items}
            total={total}
            loadingMore={loadingMore}
            loadMoreError={loadMoreError}
            onLoadMore={() => void handleLoadMore()}
          />
        </div>

        <FeedbackTopSidebar posts={top3} />
      </div>
    </main>
  );
}
