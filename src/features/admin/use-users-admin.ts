"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  usersClient,
  type BanDuration,
  type BanUserInput,
} from "@/src/shared/lib/users-client";
import {
  isBanReasonValid,
  buildBanReasonPayload,
  type BanReasonState,
} from "@/src/shared/components/BanReasonPicker";
import {
  useAdminUsers,
  patchAdminUser,
} from "@/src/features/admin/api/admin.queries";
import type { UsersPageFilters } from "@/src/features/admin/api/admin";
import type { AdminUserRow } from "@/src/shared/types/admin";
import type { AdminUserSort } from "@/src/shared/lib/admin-client";

const SEARCH_DEBOUNCE_MS = 300;

/** The banned-filter's three states as a single select value. */
export type BannedFilter = "all" | "banned" | "active";

function bannedFlag(filter: BannedFilter): boolean | undefined {
  return filter === "all" ? undefined : filter === "banned";
}

export function isCurrentlyBanned(bannedUntil: string | null): boolean {
  return bannedUntil !== null && new Date(bannedUntil).getTime() > Date.now();
}

/**
 * All the data + moderation-action state for {@link UsersTab}: the debounced
 * search (an infinite query), the inline ban-form state, and the mutations that
 * patch the cached list. The view is a thin renderer over this.
 */
export function useUsersAdmin() {
  const t = useTranslations("admin");
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<AdminUserSort>("newest");
  const [bannedFilter, setBannedFilter] = useState<BannedFilter>("all");
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState<BanReasonState>({
    reason: "",
    reasonDetail: "",
  });

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters: UsersPageFilters = useMemo(
    () => ({ q: query, sort, banned: bannedFlag(bannedFilter) }),
    [query, sort, bannedFilter],
  );
  const usersQuery = useAdminUsers(filters);

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

  const banMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & BanUserInput) =>
      usersClient.ban(id, input),
    onSuccess: (result, { id }) => {
      patchAdminUser(queryClient, filters, id, {
        bannedUntil: result.bannedUntil,
      });
      setBanTargetId(null);
      setBanReason({ reason: "", reasonDetail: "" });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => usersClient.unban(id),
    onSuccess: (_result, id) =>
      patchAdminUser(queryClient, filters, id, { bannedUntil: null }),
  });

  const trustMutation = useMutation({
    mutationFn: ({ id, trusted }: { id: string; trusted: boolean }) =>
      usersClient.setTrusted(id, trusted),
    onSuccess: (_result, { id, trusted }) =>
      patchAdminUser(queryClient, filters, id, { trusted }),
  });

  const actionError = banMutation.isError
    ? t("banUserError")
    : unbanMutation.isError
      ? t("unbanUserError")
      : trustMutation.isError
        ? trustMutation.variables?.trusted
          ? t("trustError")
          : t("untrustError")
        : usersQuery.isFetchNextPageError
          ? t("loadMoreUsersError")
          : "";

  function handleBan(id: string) {
    if (!isBanReasonValid(banReason)) return;
    banMutation.mutate({
      id,
      duration: banDuration,
      ...buildBanReasonPayload(banReason),
    });
  }

  function toggleBanForm(id: string) {
    const opening = banTargetId !== id;
    setBanTargetId(opening ? id : null);
    if (opening) {
      setBanDuration("week");
      setBanReason({ reason: "", reasonDetail: "" });
    }
  }

  return {
    searchInput,
    setSearchInput,
    sort,
    setSort,
    bannedFilter,
    setBannedFilter,
    users,
    total,
    status,
    loadingMore: usersQuery.isFetchingNextPage,
    banTargetId,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    actionError,
    // Per-action in-flight ids, so a row can spin only the button being used
    // (and block a second click) rather than disabling the whole table.
    banPending: banMutation.isPending,
    trustPendingId: trustMutation.isPending
      ? (trustMutation.variables?.id ?? null)
      : null,
    unbanPendingId: unbanMutation.isPending
      ? (unbanMutation.variables ?? null)
      : null,
    handleLoadMore: () => usersQuery.fetchNextPage(),
    handleBan,
    handleUnban: (id: string) => unbanMutation.mutate(id),
    handleSetTrusted: (id: string, trusted: boolean) =>
      trustMutation.mutate({ id, trusted }),
    toggleBanForm,
  };
}
