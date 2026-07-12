"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import { Hidden } from "@/src/shared/components/Hidden";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useStreamerModeOrDefault } from "@/src/shared/lib/streamer-mode-context";
import { usersClient } from "@/src/shared/lib/users-client";
import {
  useAdminUsers,
  patchAdminUser,
} from "@/src/features/admin/api/admin.queries";
import {
  assignableRolesFor,
  type AssignableRole,
} from "@/src/shared/lib/staff-permissions";
import type { AdminUserRow } from "@/src/shared/types/admin";

const SEARCH_DEBOUNCE_MS = 300;

export function StaffTab() {
  const { user } = useAuth();
  // Streamer mode masks identity visually; also keep it out of the role-select
  // aria-label so a screen reader on a shared screen doesn't announce the name.
  const { enabled: streamerMode } = useStreamerModeOrDefault();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const usersQuery = useAdminUsers(query);

  const users = useMemo(() => {
    const seen = new Set<string>();
    const out: AdminUserRow[] = [];
    for (const page of usersQuery.data?.pages ?? []) {
      for (const row of page.items) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          out.push(row);
        }
      }
    }
    return out;
  }, [usersQuery.data]);

  const total = usersQuery.data?.pages.at(-1)?.total ?? 0;
  const hasData = usersQuery.data !== undefined;
  const status = usersQuery.isLoading
    ? "loading"
    : !hasData && usersQuery.isError
      ? "error"
      : "ready";
  const loadingMore = usersQuery.isFetchingNextPage;

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AssignableRole }) =>
      usersClient.changeRole(id, role),
    onSuccess: (result, { id }) =>
      patchAdminUser(queryClient, query, id, { role: result.role }),
  });

  const actionError = changeRole.isError
    ? "Couldn't change this user's role. Try again."
    : usersQuery.isFetchNextPageError
      ? "Couldn't load more users. Try again."
      : "";

  function handleRoleChange(id: string, role: AssignableRole) {
    changeRole.mutate({ id, role });
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
        <Text className="text-danger">
          Couldn&apos;t load users. Try again later.
        </Text>
      )}
      {status === "ready" && users.length === 0 && (
        <Text variant="secondary">No users match this search.</Text>
      )}

      {status === "ready" && users.length > 0 && (
        <div className="flex flex-col gap-3">
          {users.map((row) => {
            const options = assignableRolesFor(user.role, row.role).filter(
              (role) => role !== row.role,
            );
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[15px] border border-border bg-surface p-4"
              >
                <div>
                  <Text className="font-semibold">
                    <Hidden kind="name" id={row.id}>
                      <Username
                        username={row.username}
                        role={row.role}
                        trusted={row.trusted}
                      />
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
                    aria-label={
                      streamerMode
                        ? "Change role for this user"
                        : `Change role for ${row.username}`
                    }
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

      {actionError && (
        <Text className="text-sm text-danger">{actionError}</Text>
      )}

      {status === "ready" && users.length < total && (
        <Button
          variant="secondary"
          disabled={loadingMore}
          onClick={() => void usersQuery.fetchNextPage()}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
