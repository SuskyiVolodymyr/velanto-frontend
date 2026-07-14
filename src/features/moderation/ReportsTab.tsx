"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { DataTable, DataTableRow } from "@/src/shared/components/DataTable";
import { TablePagination } from "@/src/shared/components/TablePagination";
import { reportReasonLabel } from "@/src/shared/lib/report-reasons";
import { reportTargetLabel } from "@/src/shared/lib/report-display";
import { ReportFilters } from "@/src/features/moderation/ReportFilters";
import { useReportsList } from "@/src/features/moderation/api/reports-list.queries";
import { MODERATION_PAGE_SIZE } from "@/src/features/moderation/api/moderation";
import type { ReportsListFilters } from "@/src/features/moderation/api/reports-list";

const COLUMNS = "70px 1.4fr 1.1fr 1fr 100px 110px";

export function ReportsTab() {
  const [status, setStatus] = useState<ReportsListFilters["status"]>(undefined);
  const [type, setType] = useState<ReportsListFilters["type"]>(undefined);
  const [page, setPage] = useState(1);

  const filters = useMemo<ReportsListFilters>(
    () => ({ status, type }),
    [status, type],
  );

  // A filter change re-scopes the list, so a page number carried over from the
  // old result set would be meaningless (and can be past the end).
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPage(1);
  }, [filters]);

  const reportsQuery = useReportsList(filters, page, { enabled: true });
  const reports = reportsQuery.data?.items ?? [];
  const total = reportsQuery.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <ReportFilters
        statusFilter={status}
        onStatusChange={setStatus}
        typeFilter={type}
        onTypeChange={setType}
      />

      {reportsQuery.isLoading && (
        <LoadingState label="Loading reports…" showLabel />
      )}
      {reportsQuery.isError && (
        <Text className="text-danger">
          Couldn&apos;t load reports. Try again later.
        </Text>
      )}

      {!reportsQuery.isLoading && !reportsQuery.isError && (
        <>
          <DataTable
            columns={COLUMNS}
            headers={["Type", "Target", "Reason", "Reporter", "Date", "Status"]}
            empty="No reports match these filters."
            isEmpty={reports.length === 0}
          >
            {reports.map((report) => {
              const target = reportTargetLabel(report);
              return (
                <DataTableRow key={report.id} columns={COLUMNS}>
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-foreground-secondary">
                    {report.type}
                  </span>
                  {/* The whole row used to be one <a>; a link per row inside a
                      grid of cells keeps the table semantics intact. */}
                  <Link
                    href={`/moderation/reports/${report.id}`}
                    className="block truncate text-[13px] font-semibold text-foreground hover:text-acc"
                  >
                    {target.text}
                  </Link>
                  <Text variant="secondary" className="truncate text-[13px]">
                    {reportReasonLabel(report.type, report.reason)}
                  </Text>
                  <Text variant="tertiary" className="truncate text-[13px]">
                    {report.reporterUsername}
                  </Text>
                  <Text variant="tertiary" className="text-[12.5px]">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </Text>
                  <StatusBadge kind="report" status={report.status} />
                </DataTableRow>
              );
            })}
          </DataTable>

          <TablePagination
            page={page}
            total={total}
            pageSize={MODERATION_PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
