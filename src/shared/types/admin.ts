import type { Role } from "@/src/shared/types/user";

/** One bar of the overview's "plays — last 7 days" chart. */
export interface PlaysDayBucket {
  /** Calendar day, YYYY-MM-DD. */
  date: string;
  plays: number;
}

/** One row of the overview's "top packs today" list. */
export interface TopPackToday {
  id: string;
  title: string;
  plays: number;
}

export interface AdminOverview {
  registeredUsers: number;
  packs: number;
  plays: number;
  // Always null — no presence tracking yet; rendered as "—" (see OverviewTab).
  onlineUsers: null;
  // Real count of open (unresolved) reports. Was null before the report
  // feature shipped — see velanto-backend#71.
  pendingReports: number;
  // Trailing-7-day deltas behind each metric card's sub-line.
  newUsersThisWeek: number;
  newPacksThisWeek: number;
  playsThisWeek: number;
  /** Always 7 buckets, oldest first, zero-filled by the backend. */
  playsLast7Days: PlaysDayBucket[];
  topPacksToday: TopPackToday[];
}

/** Aggregate per-user stats for the admin user-detail page (GET /admin/users/:id). */
export interface AdminUserDetail {
  id: string;
  username: string;
  email: string;
  role: Role;
  trusted: boolean;
  createdAt: string;
  bannedUntil: string | null;
  banReason: string | null;
  content: {
    packsTotal: number;
    packsApproved: number;
    packsPending: number;
    packsRejected: number;
    totalPlaysOnPacks: number;
    likesOnPacks: number;
  };
  activity: {
    commentsCount: number;
    playsRecorded: number;
  };
  social: {
    followers: number;
    following: number;
  };
  moderation: {
    reportsAgainst: number;
    reportsFiled: number;
  };
}

export interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
  bannedUntil: string | null;
  trusted: boolean;
  /** Packs authored / plays recorded — the Users table's PACKS and PLAYS columns. */
  packs: number;
  plays: number;
  /**
   * Staff tab's ADDED BY / SINCE. Null for non-staff, and for staff promoted
   * before the backend started recording it — rendered as an em dash rather
   * than a fabricated value.
   */
  staffAddedBy: string | null;
  staffSince: string | null;
}

export interface AdminUserList {
  items: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorUsername: string;
  action: string;
  target: string;
  meta: unknown;
  createdAt: string;
}

export interface AuditLogList {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}
