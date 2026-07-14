"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Select } from "@/src/shared/components/Select";
import { Hidden } from "@/src/shared/components/Hidden";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useStreamerModeOrDefault } from "@/src/shared/lib/streamer-mode-context";
import { usersClient } from "@/src/shared/lib/users-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import { useAdminStaff } from "@/src/features/admin/api/admin.queries";
import { AdminTable, AdminTableRow } from "@/src/features/admin/AdminTable";
import {
  assignableRolesFor,
  type AssignableRole,
} from "@/src/shared/lib/staff-permissions";
import type { AdminUserRow } from "@/src/shared/types/admin";

const SEARCH_DEBOUNCE_MS = 300;
const COLUMNS = "1.3fr 130px 1fr 110px 90px";

function formatSince(since: string | null): string {
  if (!since) return "—";
  return new Date(since).toLocaleDateString();
}

/**
 * Members promoted before provenance was recorded (seeded, or promoted straight
 * in the DB) have no promoter — nobody in the User table put them there. They
 * read as "System" rather than a blank cell or a fabricated name. Their `since`
 * was backfilled to their account-creation date.
 */
function formatAddedBy(addedBy: string | null): string {
  return addedBy ?? "System";
}

export function StaffTab() {
  const { user } = useAuth();
  // Streamer mode masks identity visually; also keep it out of the role-select
  // aria-label so a screen reader on a shared screen doesn't announce the name.
  const { enabled: streamerMode } = useStreamerModeOrDefault();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<AssignableRole>("moderator");

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const staffQuery = useAdminStaff(query);

  const staff = useMemo(() => {
    const seen = new Set<string>();
    const out: AdminUserRow[] = [];
    for (const page of staffQuery.data?.pages ?? []) {
      for (const row of page.items) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          out.push(row);
        }
      }
    }
    return out;
  }, [staffQuery.data]);

  const total = staffQuery.data?.pages.at(-1)?.total ?? 0;
  const hasData = staffQuery.data !== undefined;
  const status = staffQuery.isLoading
    ? "loading"
    : !hasData && staffQuery.isError
      ? "error"
      : "ready";

  // A role change can add someone to, or drop them from, this staff-ONLY list,
  // so refetch rather than patching a row that may no longer belong in it.
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AssignableRole }) =>
      usersClient.changeRole(id, role),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] }),
  });

  /**
   * "+ Add staff" takes an EMAIL, but the role endpoint takes a user id — so
   * resolve the email through the admin user search first. The match must be an
   * exact email, not just the first hit: `q` is a substring search, so trusting
   * its top result could promote a different account.
   */
  const addStaff = useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: AssignableRole;
    }) => {
      const found = await adminClient.listUsers({ q: email, limit: 50 });
      const match = found.items.find(
        (row) => row.email.toLowerCase() === email.toLowerCase(),
      );
      if (!match) throw new Error("No user with that email.");
      return usersClient.changeRole(match.id, role);
    },
    onSuccess: () => {
      setAddEmail("");
      void queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
    },
  });

  const actionError = changeRole.isError
    ? "Couldn't change this member's role. Try again."
    : addStaff.isError
      ? addStaff.error.message
      : staffQuery.isFetchNextPageError
        ? "Couldn't load more staff. Try again."
        : "";

  if (!user) return null;

  // 'user' is the demote-to-nobody role — the Remove button owns it, so it
  // never belongs in the add-staff or per-row role dropdowns.
  const addableRoles = assignableRolesFor(user.role, "user").filter(
    (role) => role !== "user",
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-border bg-white/[0.02] px-[18px] py-4">
        <Input
          type="email"
          aria-label="Email of the user to add as staff"
          placeholder="name@email.com"
          value={addEmail}
          onChange={(event) => setAddEmail(event.target.value)}
          className="min-w-[180px] flex-1"
        />
        <Select
          aria-label="Role to grant"
          value={addRole}
          onChange={(event) => setAddRole(event.target.value as AssignableRole)}
          options={addableRoles.map((role) => ({ value: role, label: role }))}
          className="h-10 w-auto"
        />
        <Button
          loading={addStaff.isPending}
          disabled={!addEmail.trim()}
          onClick={() =>
            addStaff.mutate({ email: addEmail.trim(), role: addRole })
          }
        >
          + Add staff
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          type="search"
          aria-label="Search staff by username or email"
          placeholder="Search staff…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {status === "loading" && (
        <LoadingState label="Loading staff…" showLabel />
      )}
      {status === "error" && (
        <Text className="text-danger">
          Couldn&apos;t load staff. Try again later.
        </Text>
      )}

      {status === "ready" && (
        <AdminTable
          columns={COLUMNS}
          headers={["Member", "Role", "Added by", "Since", ""]}
          empty="No staff members yet."
          isEmpty={staff.length === 0}
        >
          {staff.map((row) => {
            const grantable = assignableRolesFor(user.role, row.role);
            const options = grantable.filter(
              (role) => role !== row.role && role !== "user",
            );
            const canRemove = grantable.includes("user");
            return (
              <AdminTableRow key={row.id} columns={COLUMNS}>
                <div className="min-w-0">
                  <Text className="truncate text-[13.5px] font-semibold">
                    <Hidden kind="name" id={row.id}>
                      <Username
                        username={row.username}
                        role={row.role}
                        trusted={row.trusted}
                      />
                    </Hidden>
                  </Text>
                  <Text variant="tertiary" className="truncate text-xs">
                    <Hidden kind="name" id={row.id}>
                      {row.email}
                    </Hidden>
                  </Text>
                </div>

                {options.length > 0 ? (
                  <select
                    value={row.role}
                    onChange={(event) =>
                      changeRole.mutate({
                        id: row.id,
                        role: event.target.value as AssignableRole,
                      })
                    }
                    aria-label={
                      streamerMode
                        ? "Change role for this member"
                        : `Change role for ${row.username}`
                    }
                    className="h-8 w-fit rounded-lg border border-border bg-white/[0.05] px-2 text-[12.5px] text-foreground"
                  >
                    {/* Their current role must be present as the selected option,
                        or the control would render blank whenever they hold a
                        role this actor may not grant. */}
                    <option value={row.role} disabled>
                      {row.role}
                    </option>
                    {options.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="w-fit rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground-secondary">
                    {row.role}
                  </span>
                )}

                <Text variant="secondary" className="truncate text-[13px]">
                  {formatAddedBy(row.staffAddedBy)}
                </Text>
                <Text variant="tertiary" className="text-[12.5px]">
                  {formatSince(row.staffSince)}
                </Text>

                {canRemove ? (
                  <button
                    type="button"
                    onClick={() =>
                      changeRole.mutate({ id: row.id, role: "user" })
                    }
                    className="w-fit justify-self-start rounded-md bg-danger/10 px-2.5 py-1.5 text-[12.5px] font-medium text-danger transition-colors hover:bg-danger/20"
                  >
                    Remove
                  </button>
                ) : (
                  <span />
                )}
              </AdminTableRow>
            );
          })}
        </AdminTable>
      )}

      {actionError && (
        <Text className="text-sm text-danger" role="alert">
          {actionError}
        </Text>
      )}

      {status === "ready" && staff.length < total && (
        <Button
          variant="secondary"
          loading={staffQuery.isFetchingNextPage}
          onClick={() => void staffQuery.fetchNextPage()}
        >
          {staffQuery.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
