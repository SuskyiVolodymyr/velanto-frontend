"use client";

import { useEffect, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { adminClient } from "@/src/shared/lib/admin-client";
import type { AuditLogEntry } from "@/src/shared/types/admin";

const PAGE_SIZE = 20;
const FILTER_DEBOUNCE_MS = 300;

interface Filters {
  actor: string;
  action: string;
  target: string;
}

export function LogsTab() {
  const [actorInput, setActorInput] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [filters, setFilters] = useState<Filters>({ actor: "", action: "", target: "" });
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    adminClient
      .auditLogs({
        actor: filters.actor || undefined,
        action: filters.action || undefined,
        target: filters.target || undefined,
        page: 1,
        limit: PAGE_SIZE,
      })
      .then((result) => {
        if (cancelled) return;
        setLogs(result.items);
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
  }, [filters]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await adminClient.auditLogs({
        actor: filters.actor || undefined,
        action: filters.action || undefined,
        target: filters.target || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setLogs((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        return [...prev, ...result.items.filter((l) => !existingIds.has(l.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

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
        <Text className="text-[#ff6b6b]">Couldn&apos;t load logs. Try again later.</Text>
      )}
      {status === "ready" && logs.length === 0 && (
        <Text variant="secondary">No audit log entries match these filters.</Text>
      )}

      {status === "ready" && logs.length > 0 && (
        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-[12px] border border-border bg-surface p-3 text-sm">
              <Text variant="tertiary" className="text-xs">
                {new Date(log.createdAt).toLocaleString()}
              </Text>
              <Text>
                <span className="font-semibold">{log.actorUsername}</span> · {log.action} ·{" "}
                <span className="text-foreground-secondary">{log.target}</span>
              </Text>
            </div>
          ))}
        </div>
      )}

      {status === "ready" && logs.length < total && (
        <Button variant="secondary" disabled={loadingMore} onClick={() => void handleLoadMore()}>
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
