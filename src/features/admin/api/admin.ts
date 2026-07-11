import { adminClient } from "@/src/shared/lib/admin-client";

export const ADMIN_PAGE_SIZE = 20;

export function fetchUsersPage(q: string, page: number) {
  return adminClient.listUsers({
    q: q || undefined,
    page,
    limit: ADMIN_PAGE_SIZE,
  });
}

export interface AuditLogFilters {
  actor: string;
  action: string;
  target: string;
}

export function fetchLogsPage(filters: AuditLogFilters, page: number) {
  return adminClient.auditLogs({
    actor: filters.actor || undefined,
    action: filters.action || undefined,
    target: filters.target || undefined,
    page,
    limit: ADMIN_PAGE_SIZE,
  });
}

export function fetchOverview() {
  return adminClient.overview();
}
