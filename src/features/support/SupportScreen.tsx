"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { ReportFilters } from "@/src/features/support/ReportFilters";
import { ReportList } from "@/src/features/support/ReportList";
import { useReportsList } from "@/src/features/support/api/reports-list.queries";
import type { ReportsListFilters } from "@/src/features/support/api/reports-list";
import type { Report } from "@/src/shared/types/report";

export function SupportScreen() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [statusFilter, setStatusFilter] = useState<
    ReportsListFilters["status"]
  >(undefined);
  const [typeFilter, setTypeFilter] = useState<ReportsListFilters["type"]>(
    undefined,
  );

  const allowed =
    user?.role === "moderator" ||
    user?.role === "manager" ||
    user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  const filters = useMemo<ReportsListFilters>(
    () => ({ status: statusFilter, type: typeFilter }),
    [statusFilter, typeFilter],
  );
  const reportsQuery = useReportsList(filters, { enabled: allowed });

  const seen = new Set<string>();
  const reports = (reportsQuery.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((report: Report) => {
      if (seen.has(report.id)) return false;
      seen.add(report.id);
      return true;
    });
  const total = reportsQuery.data?.pages.at(-1)?.total ?? 0;
  const hasData = reportsQuery.data !== undefined;
  const listReady = hasData && !reportsQuery.isLoading;
  const firstLoadError =
    !hasData && reportsQuery.isError ? (reportsQuery.error as Error) : null;
  const loadMoreError =
    hasData &&
    (reportsQuery.isError || reportsQuery.isFetchNextPageError)
      ? "Couldn't load more reports. Try again."
      : "";

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">
          You need to be logged in to view this page.
        </Text>
        <Button
          className="mt-4"
          onClick={() =>
            router.push(`/auth?next=${encodeURIComponent(pathname)}`)
          }
        >
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
        loading={reportsQuery.isLoading}
        error={firstLoadError}
        listReady={listReady}
        reports={reports}
        total={total}
        loadingMore={reportsQuery.isFetchingNextPage}
        loadMoreError={loadMoreError}
        onLoadMore={() => void reportsQuery.fetchNextPage()}
      />
    </main>
  );
}
