import { apiClient } from "@/api/api-client";
import type {
  PackResults,
  RankResults,
  RecordedPick,
} from "@/types/play-results";

export const playsClient = {
  record: (packId: string, input: { picks: RecordedPick[] }) =>
    apiClient.post<{ id: string }>(`/packs/${packId}/plays`, input),
  getResults: (packId: string) =>
    apiClient.get<PackResults | RankResults>(`/packs/${packId}/results`),
  /** Resolve a short `?play=<id>` result-share link to its recorded picks. */
  getSharedPicks: (playId: string) =>
    apiClient.get<{ picks: RecordedPick[] }>(
      `/plays/${encodeURIComponent(playId)}`,
    ),
};
