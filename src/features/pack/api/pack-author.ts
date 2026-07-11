import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { PublicUserProfile } from "@/src/shared/types/user";

export interface PackAuthor {
  profile: PublicUserProfile;
  /** The author's total (approved) pack count — for the creator card's stats. */
  packsTotal: number;
}

/**
 * Fetch function (no React) for a pack author's public identity + pack count.
 * Composed from the shared feature clients; the hook layer
 * (`pack-author.queries.ts`) wraps this in useQuery.
 */
export async function getPackAuthor(authorId: string): Promise<PackAuthor> {
  const [profile, packs] = await Promise.all([
    usersClient.getProfile(authorId),
    packsClient.list({ authorId, limit: 1 }),
  ]);
  return { profile, packsTotal: packs.total };
}
