"use client";

import { useEffect, useMemo, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { useAdminLogs } from "@/src/features/admin/api/admin.queries";
import type { AuditLogFilters } from "@/src/features/admin/api/admin";
import type { AuditLogEntry } from "@/src/shared/types/admin";

const FILTER_DEBOUNCE_MS = 300;

export function LogsTab() {
  const [actorInput, setActorInput] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [filters, setFilters] = useState<AuditLogFilters>({
    actor: "",
    action: "",
    target: "",
  });

  useEffect(() => {
    const timeout = setTimeout(
      () =>
        setFilters({
          actor: actorInput.trim(),
          action: actionInput.trim(),
          target: targetInput.trim(),
        }),
      FILTER_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [actorInput, actionInput, targetInput]);

  const logsQuery = useAdminLogs(filters);

  const logs = useMemo(() => {
    const seen = new Set<string>();
    const out: AuditLogEntry[] = [];
    for (const page of logsQuery.data?.pages ?? []) {
      for (const entry of page.items) {
        if (!seen.has(entry.id)) {
          seen.add(entry.id);
          out.push(entry);
        }
      }
    }
    return out;
  }, [logsQuery.data]);

  const total = logsQuery.data?.pages.at(-1)?.total ?? 0;
  const hasData = logsQuery.data !== undefined;
  const status = logsQuery.isLoading
    ? "loading"
    : !hasData && logsQuery.isError
      ? "error"
      : "ready";
  const loadingMore = logsQuery.isFetchingNextPage;
  const loadMoreError =
    hasData && (logsQuery.isError || logsQuery.isFetchNextPageError)
      ? "Couldn't load more logs. Try again."
      : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="Filter by actor"
          placeholder="Actor ID"
          value={actorInput}
          onChange={(e) => setActorInput(e.target.value)}
          className="max-w-[200px]"
        />
        <Input
          aria-label="Filter by action"
          placeholder="Action"
          value={actionInput}
          onChange={(e) => setActionInput(e.target.value)}
          className="max-w-[200px]"
        />
        <Input
          aria-label="Filter by target"
          placeholder="Target"
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          className="max-w-[200px]"
        />
      </div>

      {status === "loading" && <Text variant="secondary">Loading logs…</Text>}
      {status === "error" && (
        <Text className="text-danger">
          Couldn&apos;t load logs. Try again later.
        </Text>
      )}
      {status === "ready" && logs.length === 0 && (
        <Text variant="secondary">
          No audit log entries match these filters.
        </Text>
      )}

      {status === "ready" && logs.length > 0 && (
        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-[12px] border border-border bg-surface p-3 text-sm"
            >
              <Text variant="tertiary" className="text-xs">
                {new Date(log.createdAt).toLocaleString()}
              </Text>
              <Text>
                <span className="font-semibold">{log.actorUsername}</span> ·{" "}
                {log.action} ·{" "}
                <span className="text-foreground-secondary">{log.target}</span>
              </Text>
            </div>
          ))}
        </div>
      )}

      {status === "ready" && logs.length < total && (
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            disabled={loadingMore}
            onClick={() => void logsQuery.fetchNextPage()}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
          {loadMoreError && (
            <Text className="text-sm text-danger">{loadMoreError}</Text>
          )}
        </div>
      )}
    </div>
  );
}
