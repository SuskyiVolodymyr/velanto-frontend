import {
  adminClient,
  type AdminUserSort,
  type AuditLogSort,
} from "@/src/shared/lib/admin-client";

export const ADMIN_PAGE_SIZE = 20;

/** The Users tab's filter state (beyond pagination). */
export interface UsersPageFilters {
  q: string;
  /** Registration-date order. */
  sort: AdminUserSort;
  /** undefined = all, true = only banned, false = only not banned. */
  banned?: boolean;
}

/**
 * The Users tab lists NON-staff only — staff are managed on their own tab, and
 * showing them in both was just noise (and invited acting on a colleague from
 * the wrong screen).
 */
export function fetchUsersPage(filters: UsersPageFilters, page: number) {
  return adminClient.listUsers({
    q: filters.q || undefined,
    staff: false,
    banned: filters.banned,
    sort: filters.sort,
    page,
    limit: ADMIN_PAGE_SIZE,
  });
}

/**
 * The Staff tab is the same users endpoint narrowed to staff roles, so staff
 * rows carry the same shape plus the ADDED BY / SINCE provenance.
 */
export function fetchStaffPage(q: string, page: number) {
  return adminClient.listUsers({
    q: q || undefined,
    staff: true,
    page,
    limit: ADMIN_PAGE_SIZE,
  });
}

export interface AuditLogFilters {
  /** Free-text across actor, target and details. */
  q: string;
  action: string;
  /** Inclusive calendar-day bounds, YYYY-MM-DD; empty means unbounded. */
  from: string;
  to: string;
  sort: AuditLogSort;
}

export const EMPTY_AUDIT_FILTERS: AuditLogFilters = {
  q: "",
  action: "",
  from: "",
  to: "",
  sort: "newest",
};

export function fetchLogsPage(filters: AuditLogFilters, page: number) {
  return adminClient.auditLogs({
    q: filters.q || undefined,
    action: filters.action || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    sort: filters.sort,
    page,
    limit: ADMIN_PAGE_SIZE,
  });
}

export function fetchOverview() {
  return adminClient.overview();
}
