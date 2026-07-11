"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportsClient } from "@/src/shared/lib/reports-client";
import type { Report } from "@/src/shared/types/report";
import { reportQueryOptions } from "./report-detail.queries";

function usePatchReport(reportId: string) {
  const queryClient = useQueryClient();
  const { queryKey } = reportQueryOptions(reportId);
  return (updated: Report) =>
    queryClient.setQueryData<Report>(queryKey, (prev) =>
      prev ? { ...prev, ...updated } : updated,
    );
}

/** Mark a report as under review; patches the report cache with the result. */
export function useReviewReport(reportId: string) {
  const patch = usePatchReport(reportId);
  return useMutation({
    mutationFn: () => reportsClient.review(reportId),
    onSuccess: patch,
  });
}

/** Close a report; patches the report cache with the result. */
export function useCloseReport(reportId: string) {
  const patch = usePatchReport(reportId);
  return useMutation({
    mutationFn: () => reportsClient.close(reportId),
    onSuccess: patch,
  });
}
