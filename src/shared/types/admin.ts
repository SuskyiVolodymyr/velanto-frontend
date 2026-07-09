import type { Role } from "@/src/shared/types/user";

export interface AdminOverview {
  registeredUsers: number;
  packs: number;
  plays: number;
  // Always null — no presence tracking yet; rendered as "—" (see OverviewTab).
  onlineUsers: null;
  // Real count of open (unresolved) reports. Was null before the report
  // feature shipped — see velanto-backend#71.
  pendingReports: number;
}

export interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
  bannedUntil: string | null;
  trusted: boolean;
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
