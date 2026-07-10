"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { reportsClient, type ListReportsFilters } from "@/src/shared/lib/reports-client";
import { reportReasonLabel } from "@/src/shared/lib/report-reasons";
import { reportTargetLabel } from "@/src/shared/lib/report-display";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import type { ReportStatus, ReportType } from "@/src/shared/types/report";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: ReportStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "closed", label: "Closed" },
];

const TYPE_FILTERS: { value: ReportType | undefined; label: string }[] = [
  { value: undefined, label: "All types" },
  { value: "pack", label: "Packs" },
  { value: "user", label: "Users" },
  { value: "round", label: "Rounds" },
];

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

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            aria-pressed={statusFilter === f.value}
            className={`rounded-[9px] border px-3.5 py-2 text-sm font-medium ${
              statusFilter === f.value ? "border-acc/40 bg-acc/10 text-acc" : "border-border bg-white/[0.02] text-foreground-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            aria-pressed={typeFilter === f.value}
            className={`rounded-[9px] border px-3.5 py-2 text-sm font-medium ${
              typeFilter === f.value ? "border-acc/40 bg-acc/10 text-acc" : "border-border bg-white/[0.02] text-foreground-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reportsQuery.loading && <Text variant="secondary">Loading reports…</Text>}
      {reportsQuery.error && <Text className="text-[#ff6b6b]">Couldn&apos;t load reports. Try again later.</Text>}
      {reportsQuery.data && reports.length === 0 && <Text variant="secondary">No reports match these filters.</Text>}

      {reportsQuery.data && reports.length > 0 && (
        <div className="flex flex-col gap-2">
          {reports.map((report) => {
            const target = reportTargetLabel(report);
            return (
              <Link
                key={report.id}
                href={`/support/${report.id}`}
                className="grid grid-cols-[70px_1.4fr_1.1fr_1fr_100px_110px] items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 text-sm hover:bg-white/[0.03]"
              >
                <span className="text-xs font-semibold uppercase text-foreground-secondary">{report.type}</span>
                <Text className="truncate font-semibold">{target.text}</Text>
                <Text variant="secondary" className="truncate">
                  {reportReasonLabel(report.type, report.reason)}
                </Text>
                <Text variant="tertiary" className="truncate">
                  {report.reporterUsername}
                </Text>
                <Text variant="tertiary" className="text-xs">
                  {new Date(report.createdAt).toLocaleDateString()}
                </Text>
                <StatusBadge kind="report" status={report.status} />
              </Link>
            );
          })}
        </div>
      )}

      {reportsQuery.data && reports.length < total && (
        <div className="flex flex-col gap-2">
          <Button variant="secondary" disabled={loadingMore} onClick={() => void handleLoadMore()}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
          {loadMoreError && <Text className="text-sm text-[#ff6b6b]">{loadMoreError}</Text>}
        </div>
      )}
    </main>
  );
}
