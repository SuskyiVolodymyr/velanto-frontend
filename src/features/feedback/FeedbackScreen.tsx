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
import { PageHeader } from "@/src/shared/components/PageHeader";
import { PlusIcon } from "@/src/shared/components/icons";
import { FeedbackFilters } from "@/src/features/feedback/FeedbackFilters";
import { FeedbackList } from "@/src/features/feedback/FeedbackList";
import { FeedbackTopSidebar } from "@/src/features/feedback/FeedbackTopSidebar";
import {
  useFeedbackList,
  useTopFeedback,
} from "@/src/features/feedback/api/feedback-list.queries";
import type { FeedbackListFilters } from "@/src/features/feedback/api/feedback-list";
import { cn } from "@/src/shared/lib/cn";
import { pageContainer } from "@/src/shared/lib/page-container";

const SEARCH_DEBOUNCE_MS = 300;

export function FeedbackScreen() {
  const t = useTranslations("feedback");
  const th = useTranslations("header");
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

  // Sort is deliberately excluded: it reorders the board, it doesn't narrow it,
  // so "Clear filters" leaving your chosen ordering alone is the correct
  // surprise-free behaviour.
  const filtering = Boolean(q || topic || statusFilter);

  function handleClearFilters() {
    setSearchInput("");
    setQ("");
    setTopic(undefined);
    setStatusFilter(undefined);
  }

  return (
    <>
      <PageHeader
        back={{ href: "/", label: th("browse") }}
        trailing={
          <Button type="button" size="sm" onClick={handleNewPost}>
            <PlusIcon size={15} strokeWidth={2.4} />
            {t("newPost")}
          </Button>
        }
      />
      <main
        className={cn(
          pageContainer(1120),
          "flex flex-1 flex-col gap-[22px] pt-[26px] pb-20",
        )}
      >
        <section className="flex flex-col gap-1.5">
          <Text as="h1" variant="title" className="text-[28px]">
            {t("pageTitle")}
          </Text>
          <Text variant="secondary" className="max-w-[64ch] text-sm">
            {t("pageSubtitle")}
          </Text>
        </section>

        {/* One-column below 1000px, matching the mock's own breakpoint — the
            300px rail is unreadable any narrower and belongs under the list. */}
        <div className="grid grid-cols-1 items-start gap-5 min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
          <div className="flex min-w-0 flex-col gap-3.5">
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
              filtering={filtering}
              onClearFilters={handleClearFilters}
              onNewPost={handleNewPost}
            />
          </div>

          <FeedbackTopSidebar posts={top3} />
        </div>
      </main>
    </>
  );
}
