import type { PackResults } from "@/src/shared/types/play-results";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Server Component-only fetch, mirroring getPackServer's cache: "no-store"
 * rationale — aggregate results should reflect the play just recorded.
 */
export async function getResultsServer(packId: string): Promise<PackResults> {
  const res = await fetch(`${API_BASE_URL}/packs/${packId}/results`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load results: ${res.status}`);
  return (await res.json()) as PackResults;
}
