import { reportsClient } from "@/src/shared/lib/reports-client";
import type { ReportStatus, ReportType } from "@/src/shared/types/report";

import { MODERATION_PAGE_SIZE } from "./moderation";

/** The Reports tab's list request, resolved from the filter chips. Also the
 * query key, so its values fully determine a cache entry. */
export interface ReportsListFilters {
  status?: ReportStatus;
  type?: ReportType;
}

type ReportsPage = Awaited<ReturnType<typeof reportsClient.list>>;

export function fetchReportsPage(
  filters: ReportsListFilters,
  page: number,
): Promise<ReportsPage> {
  return reportsClient.list({
    status: filters.status,
    type: filters.type,
    page,
    limit: MODERATION_PAGE_SIZE,
  });
}
