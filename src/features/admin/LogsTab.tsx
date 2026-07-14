"use client";

import { useEffect, useState } from "react";
import { cn } from "@/src/shared/lib/cn";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Select } from "@/src/shared/components/Select";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { useAdminLogs } from "@/src/features/admin/api/admin.queries";
import {
  ADMIN_PAGE_SIZE,
  EMPTY_AUDIT_FILTERS,
  type AuditLogFilters,
} from "@/src/features/admin/api/admin";
import { DataTable, DataTableRow } from "@/src/shared/components/DataTable";
import { TablePagination } from "@/src/shared/components/TablePagination";
import {
  AUDIT_ACTIONS,
  auditActionStyle,
} from "@/src/features/admin/audit-actions";

const FILTER_DEBOUNCE_MS = 300;
const COLUMNS = "150px 1.1fr 150px 1fr 1.2fr";

/** Audit `meta` is an arbitrary JSON blob; render it as a compact one-liner. */
function formatMeta(meta: unknown): string {
  if (meta === null || meta === undefined) return "—";
  if (typeof meta === "string") return meta;
  return JSON.stringify(meta);
}

export function LogsTab() {
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<AuditLogFilters>(EMPTY_AUDIT_FILTERS);
  const [page, setPage] = useState(1);

  // Only the free-text box is debounced; the selects and date pickers commit
  // immediately (each changes in one discrete step, not per keystroke).
  //
  // Returning `prev` unchanged when the term is identical is load-bearing, not a
  // micro-optimisation: `filters` identity is what the reset-to-page-1 effect
  // below watches, so minting a new object on every debounce tick would knock
  // the user back to page 1 ~300ms after they paged forward.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const q = searchInput.trim();
      setFilters((prev) => (prev.q === q ? prev : { ...prev, q }));
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Any filter change re-scopes the list, so a page number carried over from the
  // old result set would be meaningless (and can be past the end).
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPage(1);
  }, [filters]);

  const logsQuery = useAdminLogs(filters, page);
  const logs = logsQuery.data?.items ?? [];
  const total = logsQuery.data?.total ?? 0;

  function patch(next: Partial<AuditLogFilters>) {
    setFilters((prev) => ({ ...prev, ...next }));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sizing lives on wrapper divs: Input and Select are w-full primitives
          and `cn` is a plain joiner, so a `flex-1`/`w-auto` className loses to
          their own w-full and each control claims a full row. */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-[200px] flex-1">
          <Input
            type="search"
            aria-label="Search actor, target, details"
            placeholder="Search actor, target, details"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="w-[190px]">
          <Select
            aria-label="Filter by action"
            value={filters.action}
            onChange={(event) => patch({ action: event.target.value })}
            options={[
              { value: "", label: "All actions" },
              ...Object.entries(AUDIT_ACTIONS).map(([value, { label }]) => ({
                value,
                label,
              })),
            ]}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Text variant="tertiary" className="text-[11.5px]">
            From
          </Text>
          <input
            type="date"
            aria-label="From date"
            value={filters.from}
            onChange={(event) => patch({ from: event.target.value })}
            className="h-11 rounded-[10px] border border-border bg-white/[0.05] px-2.5 text-[13px] text-foreground"
          />
          <Text variant="tertiary" className="text-[11.5px]">
            to
          </Text>
          <input
            type="date"
            aria-label="To date"
            value={filters.to}
            onChange={(event) => patch({ to: event.target.value })}
            className="h-11 rounded-[10px] border border-border bg-white/[0.05] px-2.5 text-[13px] text-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            patch({ sort: filters.sort === "newest" ? "oldest" : "newest" })
          }
          className="h-11 rounded-[10px] border border-border bg-white/[0.05] px-3.5 text-[13px] font-medium text-foreground-secondary transition-colors hover:bg-white/[0.08]"
        >
          Sort: {filters.sort === "newest" ? "Newest" : "Oldest"}
        </button>
      </div>

      {logsQuery.isLoading && <LoadingState label="Loading logs…" showLabel />}
      {logsQuery.isError && (
        <Text className="text-danger">
          Couldn&apos;t load logs. Try again later.
        </Text>
      )}

      {!logsQuery.isLoading && !logsQuery.isError && (
        <>
          <DataTable
            columns={COLUMNS}
            headers={["Time", "Actor", "Action", "Target", "Details"]}
            empty="No log entries match these filters."
            isEmpty={logs.length === 0}
          >
            {logs.map((log) => {
              const action = auditActionStyle(log.action);
              return (
                <DataTableRow key={log.id} columns={COLUMNS}>
                  <Text
                    variant="tertiary"
                    className="text-[12.5px] tabular-nums"
                  >
                    {new Date(log.createdAt).toLocaleString()}
                  </Text>
                  <Text className="truncate text-[13px] font-semibold">
                    {log.actorUsername}
                  </Text>
                  <span
                    className={cn(
                      "w-fit rounded-md px-2 py-1 text-[11.5px] font-semibold tracking-[0.03em]",
                      action.className,
                    )}
                  >
                    {action.label}
                  </span>
                  <Text variant="secondary" className="truncate text-[13px]">
                    {log.target}
                  </Text>
                  <Text variant="tertiary" className="truncate text-[12.5px]">
                    {formatMeta(log.meta)}
                  </Text>
                </DataTableRow>
              );
            })}
          </DataTable>

          <TablePagination
            page={page}
            total={total}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
