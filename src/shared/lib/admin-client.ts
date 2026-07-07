import { apiClient } from "@/src/shared/lib/api-client";
import type { AdminOverview, AdminUserList, AuditLogList } from "@/src/shared/types/admin";

export interface ListAdminUsersFilters {
  q?: string;
  page?: number;
  limit?: number;
}

export interface ListAuditLogsFilters {
  actor?: string;
  action?: string;
  target?: string;
  page?: number;
  limit?: number;
}

function buildUsersQuery(filters: ListAdminUsersFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
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
