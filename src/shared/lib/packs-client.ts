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

export const packsClient = {
  create: (input: CreatePackInput) => apiClient.post<Pack>("/packs", input),
  getById: (id: string) => apiClient.get<Pack>(`/packs/${id}`),
};
