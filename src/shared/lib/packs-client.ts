import { apiClient } from "@/src/shared/lib/api-client";
import type { Pack, PackFormat, PackTag, Group, Category } from "@/src/shared/types/pack";

export interface CreatePackInput {
  title: string;
  description: string;
  coverTone: string;
  format: PackFormat;
  tags: PackTag[];
  groups?: Group[];
  categories?: Category[];
  versusRounds?: number;
  versusN?: number;
}

export interface ListPacksFilters {
  format?: PackFormat;
  tags?: PackTag[];
  q?: string;
  page?: number;
  limit?: number;
}

export interface PackList {
  items: Pack[];
  total: number;
  page: number;
  limit: number;
}

function buildListQuery(filters: ListPacksFilters): string {
  const params = new URLSearchParams();
  if (filters.format) params.set("format", filters.format);
  if (filters.tags && filters.tags.length > 0) params.set("tags", filters.tags.join(","));
  if (filters.q) params.set("q", filters.q);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const packsClient = {
  create: (input: CreatePackInput) => apiClient.post<Pack>("/packs", input),
  getById: (id: string) => apiClient.get<Pack>(`/packs/${id}`),
  list: (filters: ListPacksFilters = {}) => apiClient.get<PackList>(`/packs${buildListQuery(filters)}`),
};
