import { queryOptions, useQuery } from "@tanstack/react-query";
import { reportsClient } from "@/src/shared/lib/reports-client";

export function reportQueryOptions(reportId: string) {
  return queryOptions({
    queryKey: ["report", reportId] as const,
    queryFn: () => reportsClient.getById(reportId),
  });
}

/** A single report; gate with `enabled` (staff-only). */
export function useReport(reportId: string, { enabled }: { enabled: boolean }) {
  return useQuery({ ...reportQueryOptions(reportId), enabled });
}
