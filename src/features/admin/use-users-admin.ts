"use client";

import { useEffect, useState } from "react";
import { adminClient } from "@/src/shared/lib/admin-client";
import { usersClient, type BanDuration } from "@/src/shared/lib/users-client";
import {
  isBanReasonValid,
  buildBanReasonPayload,
  type BanReasonState,
} from "@/src/shared/components/BanReasonPicker";
import type { AdminUserRow } from "@/src/shared/types/admin";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function isCurrentlyBanned(bannedUntil: string | null): boolean {
  return bannedUntil !== null && new Date(bannedUntil).getTime() > Date.now();
}

/**
 * All the data + moderation-action state for {@link UsersTab}: the debounced
 * search, the paged user list, the inline ban-form state, and the optimistic
 * list updates each action applies. The view is a thin renderer over this.
 */
export function useUsersAdmin() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banDuration, setBanDuration] = useState<BanDuration>("week");
  const [banReason, setBanReason] = useState<BanReasonState>({
    reason: "",
    reasonDetail: "",
  });
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
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
      const result = await adminClient.listUsers({
        q: query || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      });
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
    if (!isBanReasonValid(banReason)) return;
    setActionError("");
    try {
      const result = await usersClient.ban(id, {
        duration: banDuration,
        ...buildBanReasonPayload(banReason),
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, bannedUntil: result.bannedUntil } : u,
        ),
      );
      setBanTargetId(null);
      setBanReason({ reason: "", reasonDetail: "" });
    } catch {
      setActionError("Couldn't ban this user. Try again.");
    }
  }

  async function handleUnban(id: string) {
    setActionError("");
    try {
      await usersClient.unban(id);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, bannedUntil: null } : u)),
      );
    } catch {
      setActionError("Couldn't unban this user. Try again.");
    }
  }

  async function handleSetTrusted(id: string, trusted: boolean) {
    setActionError("");
    try {
      await usersClient.setTrusted(id, trusted);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, trusted } : u)),
      );
    } catch {
      setActionError(
        `Couldn't ${trusted ? "trust" : "untrust"} this user. Try again.`,
      );
    }
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
    loadingMore,
    banTargetId,
    banDuration,
    setBanDuration,
    banReason,
    setBanReason,
    actionError,
    handleLoadMore,
    handleBan,
    handleUnban,
    handleSetTrusted,
    toggleBanForm,
  };
}
