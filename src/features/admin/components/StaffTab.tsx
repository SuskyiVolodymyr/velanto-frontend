"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "@/ui/Text";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";
import { LoadingState } from "@/ui/LoadingState";
import { useAuth } from "@/contexts/auth-context";
import { useStreamerModeOrDefault } from "@/contexts/streamer-mode-context";
import { usersClient } from "@/api/users-client";
import { useAdminStaff } from "@/features/admin/api/admin.queries";
import { AddStaffBar } from "@/features/admin/components/AddStaffBar";
import { StaffTable } from "@/features/admin/components/StaffTable";
import { useAddStaff } from "@/features/admin/hooks/use-add-staff";
import {
  assignableRolesFor,
  type AssignableRole,
} from "@/utils/staff-permissions";
import type { AdminUserRow } from "@/types/admin";

const SEARCH_DEBOUNCE_MS = 300;

export function StaffTab() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  // Streamer mode masks identity visually; also keep it out of the role-select
  // aria-label so a screen reader on a shared screen doesn't announce the name.
  const { enabled: streamerMode } = useStreamerModeOrDefault();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const add = useAddStaff();

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

  const actionError = changeRole.isError
    ? t("changeRoleError")
    : add.errorMessage
      ? add.errorMessage
      : staffQuery.isFetchNextPageError
        ? t("loadMoreStaffError")
        : "";

  if (!user) return null;

  // 'user' is the demote-to-nobody role — the Remove button owns it, so it
  // never belongs in the add-staff or per-row role dropdowns.
  const addableRoles = assignableRolesFor(user.role, "user").filter(
    (role) => role !== "user",
  );

  return (
    <div className="flex flex-col gap-5">
      <AddStaffBar add={add} addableRoles={addableRoles} />

      <div className="max-w-sm">
        <Input
          type="search"
          aria-label={t("searchStaffAria")}
          placeholder={t("searchStaffPlaceholder")}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {status === "loading" && (
        <LoadingState label={t("loadingStaff")} showLabel />
      )}
      {status === "error" && <Text variant="danger">{t("staffError")}</Text>}

      {status === "ready" && (
        <StaffTable
          staff={staff}
          actorRole={user.role}
          streamerMode={streamerMode}
          onChangeRole={(id, role) => changeRole.mutate({ id, role })}
        />
      )}

      {actionError && (
        <Text variant="danger" className="text-sm" role="alert">
          {actionError}
        </Text>
      )}

      {status === "ready" && staff.length < total && (
        <Button
          variant="secondary"
          loading={staffQuery.isFetchingNextPage}
          onClick={() => void staffQuery.fetchNextPage()}
        >
          {staffQuery.isFetchingNextPage
            ? tCommon("loading")
            : tCommon("loadMore")}
        </Button>
      )}
    </div>
  );
}
