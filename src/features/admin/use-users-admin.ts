"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { AdminUserRow } from "@/src/shared/types/admin";

const SEARCH_DEBOUNCE_MS = 300;

export function isCurrentlyBanned(bannedUntil: string | null): boolean {
  return bannedUntil !== null && new Date(bannedUntil).getTime() > Date.now();
}

/**
 * All the data + moderation-action state for {@link UsersTab}: the debounced
 * search (an infinite query), the inline ban-form state, and the mutations that
 * patch the cached list. The view is a thin renderer over this.
 */
export function useUsersAdmin() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
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

  const banMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & BanUserInput) =>
      usersClient.ban(id, input),
    onSuccess: (result, { id }) => {
      patchAdminUser(queryClient, query, id, {
        bannedUntil: result.bannedUntil,
      });
      setBanTargetId(null);
      setBanReason({ reason: "", reasonDetail: "" });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => usersClient.unban(id),
    onSuccess: (_result, id) =>
      patchAdminUser(queryClient, query, id, { bannedUntil: null }),
  });

  const trustMutation = useMutation({
    mutationFn: ({ id, trusted }: { id: string; trusted: boolean }) =>
      usersClient.setTrusted(id, trusted),
    onSuccess: (_result, { id, trusted }) =>
      patchAdminUser(queryClient, query, id, { trusted }),
  });

  const actionError = banMutation.isError
    ? "Couldn't ban this user. Try again."
    : unbanMutation.isError
      ? "Couldn't unban this user. Try again."
      : trustMutation.isError
        ? `Couldn't ${trustMutation.variables?.trusted ? "trust" : "untrust"} this user. Try again.`
        : usersQuery.isFetchNextPageError
          ? "Couldn't load more users. Try again."
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
