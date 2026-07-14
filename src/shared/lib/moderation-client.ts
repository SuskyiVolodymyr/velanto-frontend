import { apiClient } from "@/src/shared/lib/api-client";

/** How much untouched work each moderation queue is holding. Staff-only. */
export interface ModerationCounts {
  pendingPacks: number;
  /** Reports nobody has picked up yet — 'new' only, not 'reviewing'. */
  newReports: number;
}

export const moderationClient = {
  counts: () => apiClient.get<ModerationCounts>("/moderation/counts"),
};
