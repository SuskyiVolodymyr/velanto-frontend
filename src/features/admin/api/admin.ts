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
  /** undefined = all roles, true = staff only, false = non-staff only. */
  staff?: boolean;
}

/**
 * The Users tab lists everyone, staff included, and exposes role + a staff
 * filter (staff can also be managed here, by id). Its `staff` tri-state maps
 * straight to the endpoint's: undefined = all, true = staff only, false =
 * non-staff only. The Staff tab remains the provenance-oriented view.
 */
export function fetchUsersPage(filters: UsersPageFilters, page: number) {
  return adminClient.listUsers({
    q: filters.q || undefined,
    staff: filters.staff,
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

export function fetchUserDetail(id: string) {
  return adminClient.userDetail(id);
}
