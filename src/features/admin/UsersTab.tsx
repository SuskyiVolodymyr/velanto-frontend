"use client";

import { useEffect, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import { useAuth } from "@/src/shared/lib/auth-context";
import { adminClient } from "@/src/shared/lib/admin-client";
import { usersClient, type BanDuration } from "@/src/shared/lib/users-client";
import { canActOn } from "@/src/shared/lib/staff-permissions";
import { formatBanStatus } from "@/src/shared/lib/ban-display";
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
import type { AdminUserRow } from "@/src/shared/types/admin";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function isCurrentlyBanned(bannedUntil: string | null): boolean {
  return bannedUntil !== null && new Date(bannedUntil).getTime() > Date.now();
}

export function UsersTab() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    adminClient
      .listUsers({ q: query || undefined, page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setUsers(result.items);
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
  }, [query]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await adminClient.listUsers({ q: query || undefined, page: nextPage, limit: PAGE_SIZE });
      setUsers((prev) => {
        const existingIds = new Set(prev.map((u) => u.id));
        return [...prev, ...result.items.filter((u) => !existingIds.has(u.id))];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch {
      setActionError("Couldn't load more users. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleBan(id: string) {
    if (!banReason.trim()) return;
    setActionError("");
    try {
      const result = await usersClient.ban(id, { duration: banDuration, reason: banReason.trim() });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, bannedUntil: result.bannedUntil } : u)));
      setBanTargetId(null);
      setBanReason("");
    } catch {
      setActionError("Couldn't ban this user. Try again.");
    }
  }

  async function handleUnban(id: string) {
    setActionError("");
    try {
      await usersClient.unban(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, bannedUntil: null } : u)));
    } catch {
      setActionError("Couldn't unban this user. Try again.");
    }
  }

  async function handleSetTrusted(id: string, trusted: boolean) {
    setActionError("");
    try {
      await usersClient.setTrusted(id, trusted);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, trusted } : u)));
    } catch {
      setActionError(`Couldn't ${trusted ? "trust" : "untrust"} this user. Try again.`);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-sm">
        <Input
          type="search"
          aria-label="Search users by username or email"
          placeholder="Search by username or email…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {status === "loading" && <Text variant="secondary">Loading users…</Text>}
      {status === "error" && (
        <Text className="text-[#ff6b6b]">Couldn&apos;t load users. Try again later.</Text>
      )}
      {status === "ready" && users.length === 0 && (
        <Text variant="secondary">No users match this search.</Text>
      )}

      {status === "ready" && users.length > 0 && (
        <div className="flex flex-col gap-3">
          {users.map((row) => {
            const banned = isCurrentlyBanned(row.bannedUntil);
            const canAct = canActOn(user.role, row.role);
            return (
              <div key={row.id} className="rounded-[15px] border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Text className="font-semibold">{row.username}</Text>
                    <Text variant="tertiary" className="text-xs">
                      {row.email} · <Badge>{row.role}</Badge>
                    </Text>
                    <Text variant="secondary" className="text-xs">
                      {formatBanStatus(row.bannedUntil)}
                    </Text>
                  </div>
                  {canAct && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => void handleSetTrusted(row.id, !row.trusted)}
                      >
                        {row.trusted ? "Untrust" : "Trust"}
                      </Button>
                      {banned ? (
                        <Button variant="secondary" onClick={() => void handleUnban(row.id)}>
                          Unban
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const opening = banTargetId !== row.id;
                            setBanTargetId(opening ? row.id : null);
                            if (opening) {
                              setBanDuration("week");
                              setBanReason("");
                            }
                          }}
                        >
                          Ban
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {banTargetId === row.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                    <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
                      Duration
                      <select
                        value={banDuration}
                        onChange={(e) => setBanDuration(e.target.value as BanDuration)}
                        aria-label="Ban duration"
                        className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground"
                      >
                        {BAN_DURATIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Input
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Reason"
                      aria-label="Ban reason"
                      className="h-9 max-w-xs"
                    />
                    <Button
                      variant="primary"
                      disabled={!banReason.trim()}
                      onClick={() => void handleBan(row.id)}
                    >
                      Confirm ban
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {actionError && <Text className="text-sm text-[#ff6b6b]">{actionError}</Text>}

      {status === "ready" && users.length < total && (
        <Button variant="secondary" disabled={loadingMore} onClick={() => void handleLoadMore()}>
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
