/**
 * Local, independent type definitions (this repo does not import types from
 * velanto-backend — see coding-conventions.md). Field shapes mirror
 * velanto-backend's actual shipped response shapes from PR #63.
 */
export type ReportType = "pack" | "user" | "round";
export type ReportStatus = "new" | "reviewing" | "closed";

export interface Report {
  id: string;
  type: ReportType;
  reason: string;
  comment: string | null;
  targetId: string;
  roundIndex: number | null;
  reporterId: string;
  status: ReportStatus;
  reviewedById: string | null;
  closedById: string | null;
  createdAt: string;
}

export interface ReportWithReporter extends Report {
  reporterUsername: string;
}

export interface ReportList {
  items: ReportWithReporter[];
  total: number;
  page: number;
  limit: number;
}
