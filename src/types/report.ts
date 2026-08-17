/**
 * Local, independent type definitions (this repo does not import types from
 * velanto-backend — see coding-conventions.md). Field shapes mirror
 * velanto-backend's actual shipped response shapes from PR #63.
 */
export const REPORT_TYPES = ["pack", "user", "round"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = ["new", "reviewing", "closed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

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
  /**
   * What the report points at, named: the target account's username for a
   * `user` report, the pack's title for `pack`/`round`. Null when the target
   * has since been deleted — render the id instead of an empty name (see
   * `reportTargetLabel`).
   */
  targetLabel: string | null;
}

export interface ReportList {
  items: ReportWithReporter[];
  total: number;
  page: number;
  limit: number;
}
