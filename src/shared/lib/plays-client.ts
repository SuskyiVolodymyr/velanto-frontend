import { apiClient } from "@/src/shared/lib/api-client";
import type { PackResults, RecordedPick } from "@/src/shared/types/play-results";

export const playsClient = {
  record: (packId: string, input: { picks: RecordedPick[] }) =>
    apiClient.post<{ id: string }>(`/packs/${packId}/plays`, input),
  getResults: (packId: string) => apiClient.get<PackResults>(`/packs/${packId}/results`),
};
