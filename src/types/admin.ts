import type { Role } from "@/types/user";

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
  // Signed-in users seen on an authenticated request recently (the backend owns
  // the window). NOT total traffic: anonymous visitors can browse and play but
  // have no account to attribute, so they never appear here. Was `null` until
  // presence tracking shipped in velanto-backend release/1.5.0.
  onlineUsers: number;
  /**
   * Unique visitors present right now — accounts, room guests and anonymous
   * browsers alike (velanto-backend#312). This is the honest "people on the
   * site" figure; `onlineUsers` above counts accounts only and is kept beside
   * it because it is the one number backed by durable per-account data rather
   * than an in-memory window.
   *
   * The three parts are disjoint and always sum to `unique`.
   *
   * Close, not exact: visitors behind one NAT on the same browser collapse
   * into one, and one person on a phone and a laptop counts as two. Label it
   * "unique players", never "online" — the wording must not promise a headcount
   * the number cannot deliver.
   */
  livePlayers: LivePlayers;
  // Real count of open (unresolved) reports. Was null before the report
  // feature shipped — see velanto-backend#71.
  pendingReports: number;
  /**
   * Packs sitting in the moderation queue. Separate from `pendingReports` on
   * purpose: a report is someone flagging published content, a pending pack is
   * an author waiting to be let through. One being zero says nothing about the
   * other, so a single "needs attention" number would hide whichever is smaller.
   */
  pendingPacks: number;
  // Trailing-7-day deltas behind each metric card's sub-line.
  newUsersThisWeek: number;
  newPacksThisWeek: number;
  playsThisWeek: number;
  /** Always 7 buckets, oldest first, zero-filled by the backend. */
  playsLast7Days: PlaysDayBucket[];
  topPacksToday: TopPackToday[];
  storage: GlobalStorage;
}

/**
 * Storage held RIGHT NOW, against the wall it is measured by. There is no
 * all-time or per-month figure and there cannot be one from this data: media
 * rows are hard-deleted with their S3 object, so nothing records what a user
 * used to store (velanto-backend#254).
 */
export interface GlobalStorage {
  /** Sum of every user's live counter — what uploads are enforced against. */
  usedBytes: number;
  /** MEDIA_GLOBAL_CEILING_BYTES on the backend, or its 5 GB default. */
  ceilingBytes: number;
}

export interface UserStorage {
  usedBytes: number;
  /**
   * The user's budget, or null for staff — whose budget is unlimited. Null
   * rather than a huge number or Infinity, which JSON cannot carry anyway.
   */
  limitBytes: number | null;
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
  storage: UserStorage;
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

export interface LivePlayers {
  unique: number;
  registered: number;
  guests: number;
  anonymous: number;
}

/** Which span the activity chart shows. Mirrors the backend's own enum. */
export const ACTIVITY_RANGES = ["day", "week", "month"] as const;
export type ActivityRange = (typeof ACTIVITY_RANGES)[number];

/**
 * One point on the activity chart, oldest first, with quiet periods
 * zero-filled by the backend so the axis stays continuous.
 *
 * For `week` and `month` a point is a DAY reported by its busiest hour, not a
 * daily total — unique visitors cannot be summed across hours without
 * inventing people. See ActivityHistoryService.range in the backend.
 */
export interface ActivityPoint extends LivePlayers {
  /** ISO instant: the start of the hour (day range) or of the day. */
  at: string;
}
