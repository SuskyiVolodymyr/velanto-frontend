"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { reportsClient, type ListReportsFilters } from "@/src/shared/lib/reports-client";
import { reportReasonLabel } from "@/src/shared/lib/report-reasons";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import type { ReportStatus, ReportType, ReportWithReporter } from "@/src/shared/types/report";

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

const STATUS_BADGE_CLASS: Record<ReportStatus, string> = {
  new: "border-acc/30 bg-acc/10 text-acc",
  reviewing: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  closed: "border-white/10 bg-white/[0.06] text-foreground-secondary",
};

function targetLabel(report: ReportWithReporter): { text: string; href: string } {
  const shortId = report.targetId.slice(0, 8);
  if (report.type === "user") return { text: `User ${shortId}`, href: `/users/${report.targetId}` };
  if (report.type === "round") {
    return { text: `Round ${(report.roundIndex ?? 0) + 1} of pack ${shortId}`, href: `/packs/${report.targetId}` };
  }
  return { text: `Pack ${shortId}`, href: `/packs/${report.targetId}` };
}

export function SupportScreen() {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<ReportType | undefined>(undefined);
  const [reports, setReports] = useState<ReportWithReporter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  const allowed = user?.role === "moderator" || user?.role === "manager" || user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    const filters: ListReportsFilters = { status: statusFilter, type: typeFilter, page: 1, limit: PAGE_SIZE };
    reportsClient
      .list(filters)
      .then((result) => {
        if (cancelled) return;
        setReports(result.items);
        setTotal(result.total);
        setPage(1);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, statusFilter, typeFilter]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await reportsClient.list({ status: statusFilter, type: typeFilter, page: nextPage, limit: PAGE_SIZE });
      setReports((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        return [...prev, ...result.items.filter((r) => !existingIds.has(r.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
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

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatusFilter(f.value)}
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
            onClick={() => setTypeFilter(f.value)}
            className={`rounded-[9px] border px-3.5 py-2 text-sm font-medium ${
              typeFilter === f.value ? "border-acc/40 bg-acc/10 text-acc" : "border-border bg-white/[0.02] text-foreground-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {status === "loading" && <Text variant="secondary">Loading reports…</Text>}
      {status === "error" && <Text className="text-[#ff6b6b]">Couldn&apos;t load reports. Try again later.</Text>}
      {status === "ready" && reports.length === 0 && <Text variant="secondary">No reports match these filters.</Text>}

      {status === "ready" && reports.length > 0 && (
        <div className="flex flex-col gap-2">
          {reports.map((report) => {
            const target = targetLabel(report);
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
                <Badge className={STATUS_BADGE_CLASS[report.status]}>{report.status.toUpperCase()}</Badge>
              </Link>
            );
          })}
        </div>
      )}

      {status === "ready" && reports.length < total && (
        <Button variant="secondary" disabled={loadingMore} onClick={() => void handleLoadMore()}>
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </main>
  );
}
