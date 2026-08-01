import type { AvailableMode } from "@/src/features/friends-rooms/room-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Server Component-only fetch, mirroring getPackServer's cache: "no-store"
 * rationale — a pack's rounds/pools can change (edit + re-moderation), and
 * feasibility must never lag that.
 */
export async function getAvailableModesServer(
  packId: string,
): Promise<AvailableMode[]> {
  const res = await fetch(`${API_BASE_URL}/packs/${packId}/modes`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to load available modes: ${res.status}`);
  return (await res.json()) as AvailableMode[];
}
