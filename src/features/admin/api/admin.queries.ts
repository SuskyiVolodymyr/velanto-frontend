"use client";

import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import type { AdminUserRow } from "@/src/shared/types/admin";
import {
  fetchLogsPage,
  fetchOverview,
  fetchUsersPage,
  type AuditLogFilters,
} from "./admin";

export function adminUsersQueryOptions(q: string) {
  return infiniteQueryOptions({
    queryKey: ["admin-users", q] as const,
    queryFn: ({ pageParam }) => fetchUsersPage(q, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, page) => n + page.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

export function useAdminUsers(q: string) {
  return useInfiniteQuery(adminUsersQueryOptions(q));
}

type UsersPage = Awaited<ReturnType<typeof fetchUsersPage>>;

/** Patch one user in the cached admin-users list (for a ban/role/trust action). */
export function patchAdminUser(
  queryClient: QueryClient,
  q: string,
  id: string,
  patch: Partial<AdminUserRow>,
) {
  queryClient.setQueryData<InfiniteData<UsersPage, number>>(
    adminUsersQueryOptions(q).queryKey,
    (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((user) =>
                user.id === id ? { ...user, ...patch } : user,
              ),
            })),
          }
        : old,
  );
}

export function adminLogsQueryOptions(filters: AuditLogFilters) {
  return infiniteQueryOptions({
    queryKey: ["admin-logs", filters] as const,
    queryFn: ({ pageParam }) => fetchLogsPage(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, page) => n + page.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

export function useAdminLogs(filters: AuditLogFilters) {
  return useInfiniteQuery(adminLogsQueryOptions(filters));
}

export function useAdminOverview() {
  return useQuery(
    queryOptions({ queryKey: ["admin-overview"] as const, queryFn: fetchOverview }),
  );
}
