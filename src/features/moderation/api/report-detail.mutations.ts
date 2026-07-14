"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsClient } from "@/src/shared/lib/reports-client";
import type { Report } from "@/src/shared/types/report";
import { reportQueryOptions } from "./report-detail.queries";
import { useModerationInvalidation } from "./moderation.queries";

/**
 * Patch the open report, then refetch the panel's queues: reviewing or closing a
 * report changes both its row in the Reports tab and the tab's badge, and the
 * moderator's very next move is usually Back to the panel. Patching the single
 * report alone would leave that row reading "New" (and the badge counting it)
 * until the 30s staleTime expired.
 */
function useReportActionResult(reportId: string) {
  const queryClient = useQueryClient();
  const invalidate = useModerationInvalidation();
  const { queryKey } = reportQueryOptions(reportId);
  return async (updated: Report) => {
    queryClient.setQueryData<Report>(queryKey, (prev) =>
      prev ? { ...prev, ...updated } : updated,
    );
    await invalidate();
  };
}

/** Mark a report as under review. */
export function useReviewReport(reportId: string) {
  const onResult = useReportActionResult(reportId);
  return useMutation({
    mutationFn: () => reportsClient.review(reportId),
    onSuccess: onResult,
  });
}

/** Close a report. */
export function useCloseReport(reportId: string) {
  const onResult = useReportActionResult(reportId);
  return useMutation({
    mutationFn: () => reportsClient.close(reportId),
    onSuccess: onResult,
  });
}
