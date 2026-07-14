import { apiClient } from "@/src/shared/lib/api-client";
import type {
  AdminOverview,
  AdminUserList,
  AuditLogList,
} from "@/src/shared/types/admin";

/** Newest-first is the backend default; the Logs tab can flip it. */
export type AuditLogSort = "newest" | "oldest";

export interface ListAdminUsersFilters {
  q?: string;
  /** Staff tab: restrict to moderator/admin/manager. */
  staff?: boolean;
  page?: number;
  limit?: number;
}

export interface ListAuditLogsFilters {
  actor?: string;
  action?: string;
  target?: string;
  /** Free-text across actor username, target and details. */
  q?: string;
  /** Inclusive calendar-day bounds, YYYY-MM-DD (what <input type="date"> emits). */
  from?: string;
  to?: string;
  sort?: AuditLogSort;
  page?: number;
  limit?: number;
}

function buildUsersQuery(filters: ListAdminUsersFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  // Tri-state: `true` = staff only (Staff tab), `false` = everyone EXCEPT staff
  // (Users tab), omitted = no constraint. So check for undefined, not
  // truthiness — `if (filters.staff)` would silently drop `false`.
  if (filters.staff !== undefined) {
    params.set("staff", String(filters.staff));
  }
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildAuditQuery(filters: ListAuditLogsFilters): string {
  const params = new URLSearchParams();
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.action) params.set("action", filters.action);
  if (filters.target) params.set("target", filters.target);
  if (filters.q) params.set("q", filters.q);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const adminClient = {
  overview: () => apiClient.get<AdminOverview>("/admin/overview"),
  listUsers: (filters: ListAdminUsersFilters = {}) =>
    apiClient.get<AdminUserList>(`/admin/users${buildUsersQuery(filters)}`),
  auditLogs: (filters: ListAuditLogsFilters = {}) =>
    apiClient.get<AuditLogList>(`/admin/audit-logs${buildAuditQuery(filters)}`),
};
