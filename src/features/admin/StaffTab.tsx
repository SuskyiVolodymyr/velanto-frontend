"use client";

import { useEffect, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import { Hidden } from "@/src/shared/components/Hidden";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useStreamerModeOrDefault } from "@/src/shared/lib/streamer-mode-context";
import { adminClient } from "@/src/shared/lib/admin-client";
import { usersClient } from "@/src/shared/lib/users-client";
import { assignableRolesFor, type AssignableRole } from "@/src/shared/lib/staff-permissions";
import type { AdminUserRow } from "@/src/shared/types/admin";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function StaffTab() {
  const { user } = useAuth();
  // Streamer mode masks identity visually; also keep it out of the role-select
  // aria-label so a screen reader on a shared screen doesn't announce the name.
  const { enabled: streamerMode } = useStreamerModeOrDefault();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
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

  async function handleRoleChange(id: string, role: AssignableRole) {
    setActionError("");
    try {
      const result = await usersClient.changeRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: result.role } : u)));
    } catch {
      setActionError("Couldn't change this user's role. Try again.");
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-sm">
        <Input
          type="search"
          aria-label="Search staff by username or email"
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
            const options = assignableRolesFor(user.role, row.role).filter((role) => role !== row.role);
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[15px] border border-border bg-surface p-4"
              >
                <div>
                  <Text className="font-semibold">
                    <Hidden kind="name" id={row.id}>
                      {row.username}
                    </Hidden>
                  </Text>
                  <Text variant="tertiary" className="text-xs">
                    <Hidden kind="name" id={row.id}>
                      {row.email}
                    </Hidden>{" "}
                    · <Badge>{row.role}</Badge>
                  </Text>
                </div>
                {options.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const role = e.target.value as AssignableRole;
                      e.target.value = "";
                      void handleRoleChange(row.id, role);
                    }}
                    aria-label={streamerMode ? "Change role for this user" : `Change role for ${row.username}`}
                    className="h-9 rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground"
                  >
                    <option value="" disabled>
                      Change role…
                    </option>
                    {options.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
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
