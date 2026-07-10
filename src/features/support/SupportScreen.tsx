"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { reportsClient, type ListReportsFilters } from "@/src/shared/lib/reports-client";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { ReportFilters } from "@/src/features/support/ReportFilters";
import { ReportList } from "@/src/features/support/ReportList";
import type { ReportStatus, ReportType } from "@/src/shared/types/report";

const PAGE_SIZE = 20;

export function SupportScreen() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<ReportType | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");

  const allowed = user?.role === "moderator" || user?.role === "manager" || user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  // The list fetch (loading/error/abort, and the reset to page 1 when a filter
  // chip changes) is owned by useClientData; `page` is stored in the fetched
  // data so it resets to 1 automatically on every filter-driven refetch.
  const reportsQuery = useClientData(
    async () => {
      const filters: ListReportsFilters = { status: statusFilter, type: typeFilter, page: 1, limit: PAGE_SIZE };
      const result = await reportsClient.list(filters);
      return { items: result.items, total: result.total, page: 1 };
    },
    [statusFilter, typeFilter],
    { enabled: allowed },
  );

  async function handleLoadMore() {
    const current = reportsQuery.data;
    if (!current) return;
    setLoadingMore(true);
    try {
      const nextPage = current.page + 1;
      const result = await reportsClient.list({ status: statusFilter, type: typeFilter, page: nextPage, limit: PAGE_SIZE });
      reportsQuery.setData((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.items.map((r) => r.id));
        return {
          items: [...prev.items, ...result.items.filter((r) => !existingIds.has(r.id))],
          total: result.total,
          page: nextPage,
        };
      });
      setLoadMoreError("");
    } catch {
      setLoadMoreError("Couldn't load more reports. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  const reports = reportsQuery.data?.items ?? [];
  const total = reportsQuery.data?.total ?? 0;
  // Gate the list/empty/load-more branches on a *settled* fetch (mirrors
  // NotificationsBell): during a filter-triggered refetch `loading` is true while
  // the previous data is still held, so without this the stale rows flash under
  // the loading text. `listReady` shows the loading state instead.
  const listReady = reportsQuery.data !== null && !reportsQuery.loading && reportsQuery.error === null;

  // Reset a stale load-more error whenever the active filters change. Done during
  // render (React's "adjust state on a changed input" pattern) rather than in an
  // effect.
  const filterKey = `${statusFilter ?? ""} ${typeFilter ?? ""}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setLoadMoreError("");
  }

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">You need to be logged in to view this page.</Text>
        <Button className="mt-4" onClick={() => router.push(`/auth?next=${encodeURIComponent(pathname)}`)}>
          Log in
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-7 py-10">
      <Text as="h1" variant="title" className="text-3xl">
        Reports
      </Text>

      <ReportFilters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      <ReportList
        loading={reportsQuery.loading}
        error={reportsQuery.error}
        listReady={listReady}
        reports={reports}
        total={total}
        loadingMore={loadingMore}
        loadMoreError={loadMoreError}
        onLoadMore={() => void handleLoadMore()}
      />
    </main>
  );
}
