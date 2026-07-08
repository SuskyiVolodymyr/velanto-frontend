import { apiClient } from "@/src/shared/lib/api-client";
import type { Report, ReportList, ReportType, ReportWithReporter } from "@/src/shared/types/report";

export interface CreateReportInput {
  type: ReportType;
  targetId: string;
  roundIndex?: number;
  reason: string;
  comment?: string;
}

export interface ListReportsFilters {
  status?: "new" | "reviewing" | "closed";
  type?: ReportType;
  page?: number;
  limit?: number;
}

function buildListQuery(filters: ListReportsFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const reportsClient = {
  create: (input: CreateReportInput) => apiClient.post<Report>("/reports", input),
  list: (filters: ListReportsFilters = {}) =>
    apiClient.get<ReportList>(`/reports${buildListQuery(filters)}`),
  getById: (id: string) => apiClient.get<ReportWithReporter>(`/reports/${id}`),
  review: (id: string) => apiClient.post<Report>(`/reports/${id}/review`),
  close: (id: string) => apiClient.post<Report>(`/reports/${id}/close`),
};
