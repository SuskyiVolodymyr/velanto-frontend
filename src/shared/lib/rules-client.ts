import { apiClient } from "@/src/shared/lib/api-client";
import type { RulesDocument } from "@/src/shared/types/rules";

/**
 * Client-side fetch of the public Community Rules, for Client Components that
 * need the category list at interaction time (e.g. the ban-reason picker). The
 * server-only, cached variant is `get-rules-server.ts` — use that from Server
 * Components; this goes through `apiClient` like every other client fetch.
 */
export const rulesClient = {
  getRules: () => apiClient.get<RulesDocument>("/rules"),
};
