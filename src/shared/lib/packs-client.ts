import { apiClient } from "@/src/shared/lib/api-client";
import type { Pack, PackFormat, PackTag, Group } from "@/src/shared/types/pack";

export interface CreatePackInput {
  title: string;
  description: string;
  coverTone: string;
  format: PackFormat;
  tags: PackTag[];
  groups: Group[];
}

export interface ListPacksFilters {
  format?: PackFormat;
  tags?: PackTag[];
}

function buildListQuery(filters: ListPacksFilters): string {
  const params = new URLSearchParams();
  if (filters.format) params.set("format", filters.format);
  if (filters.tags && filters.tags.length > 0) params.set("tags", filters.tags.join(","));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const packsClient = {
  create: (input: CreatePackInput) => apiClient.post<Pack>("/packs", input),
  getById: (id: string) => apiClient.get<Pack>(`/packs/${id}`),
  list: (filters: ListPacksFilters = {}) => apiClient.get<Pack[]>(`/packs${buildListQuery(filters)}`),
};
