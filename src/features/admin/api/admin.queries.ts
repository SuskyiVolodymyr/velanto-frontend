"use client";

import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import type { ActivityRange, AdminUserRow } from "@/types/admin";
import {
  fetchLogsPage,
  fetchActivity,
  fetchOverview,
  fetchStaffPage,
  fetchUserDetail,
  fetchUsersPage,
  type AuditLogFilters,
  type UsersPageFilters,
} from "./admin";

export function adminUsersQueryOptions(filters: UsersPageFilters) {
  return infiniteQueryOptions({
    // The whole filter object is part of the key, so each q/sort/banned combo
    // caches (and refetches) independently.
    queryKey: ["admin-users", filters] as const,
    queryFn: ({ pageParam }) => fetchUsersPage(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, page) => n + page.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

export function useAdminUsers(filters: UsersPageFilters) {
  return useInfiniteQuery(adminUsersQueryOptions(filters));
}

/** Same endpoint, narrowed to staff — backs the Staff tab. */
export function adminStaffQueryOptions(q: string) {
  return infiniteQueryOptions({
    queryKey: ["admin-staff", q] as const,
    queryFn: ({ pageParam }) => fetchStaffPage(q, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, page) => n + page.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

export function useAdminStaff(q: string) {
  return useInfiniteQuery(adminStaffQueryOptions(q));
}

type UsersPage = Awaited<ReturnType<typeof fetchUsersPage>>;
type UsersQueryKey =
  readonly ["admin-users", UsersPageFilters] | readonly ["admin-staff", string];

/**
 * Patch one row of a cached admin user list (after a ban/role/trust action).
 * Takes the query key so it can serve both the Users and Staff lists, which are
 * the same row shape under different keys.
 */
function patchAdminUserList(
  queryClient: QueryClient,
  queryKey: UsersQueryKey,
  id: string,
  patch: Partial<AdminUserRow>,
) {
  queryClient.setQueryData<InfiniteData<UsersPage, number>>(queryKey, (old) =>
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

export function patchAdminUser(
  queryClient: QueryClient,
  filters: UsersPageFilters,
  id: string,
  patch: Partial<AdminUserRow>,
) {
  patchAdminUserList(
    queryClient,
    adminUsersQueryOptions(filters).queryKey,
    id,
    patch,
  );
}

/**
 * The Logs tab pages with Prev/Next (per the design), not Load-more — so this is
 * a plain page-at-a-time query, not an infinite one. `keepPreviousData` holds
 * the current page on screen while the next one loads, instead of flashing empty.
 */
export function adminLogsQueryOptions(filters: AuditLogFilters, page: number) {
  return queryOptions({
    queryKey: ["admin-logs", filters, page] as const,
    queryFn: () => fetchLogsPage(filters, page),
    placeholderData: keepPreviousData,
  });
}

export function useAdminLogs(filters: AuditLogFilters, page: number) {
  return useQuery(adminLogsQueryOptions(filters, page));
}

/**
 * The activity chart's points for one range.
 *
 * `keepPreviousData` so flipping day/week/month redraws the chart in place
 * rather than collapsing it to a loading state and back — the ranges are three
 * views of one thing, not three separate screens.
 */
export function useAdminActivity(range: ActivityRange) {
  return useQuery(
    queryOptions({
      queryKey: ["admin-activity", range] as const,
      queryFn: () => fetchActivity(range),
      placeholderData: keepPreviousData,
      // The history only gains a point when an HOUR completes, so refetching on
      // every mount bought nothing and cost real latency: Neon suspends after 5
      // idle minutes, so a cold dashboard paid a compute wake just to redraw
      // the same bars. Fifteen minutes is well inside the hourly cadence and
      // still refreshes several times an hour if the tab stays open.
      staleTime: 15 * 60 * 1000,
      // The live tile above IS realtime and has no staleTime; this chart is
      // not, so re-focusing the tab should not re-fetch it.
      refetchOnWindowFocus: false,
    }),
  );
}

export function useAdminOverview() {
  return useQuery(
    queryOptions({
      queryKey: ["admin-overview"] as const,
      queryFn: fetchOverview,
    }),
  );
}

export function adminUserDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["admin-user-detail", id] as const,
    queryFn: () => fetchUserDetail(id),
  });
}

export function useAdminUserDetail(
  id: string,
  { enabled }: { enabled?: boolean } = {},
) {
  return useQuery({ ...adminUserDetailQueryOptions(id), enabled });
}
