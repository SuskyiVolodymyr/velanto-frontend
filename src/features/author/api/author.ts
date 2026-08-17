import { usersClient } from "@/shared/api/users-client";
import { packsClient } from "@/shared/api/packs-client";
import type { PublicUserProfile } from "@/shared/types/user";
import type { PackSummary } from "@/shared/types/pack";
import { AUTHOR_PACKS_PAGE_SIZE } from "./author-packs";

export interface AuthorData {
  profile: PublicUserProfile;
  packs: PackSummary[];
  packsTotal: number;
}

/**
 * Fetch function (no React) for an author page: the public profile plus the
 * first page of their packs. The hook layer (`author.queries.ts`) wraps this
 * in useQuery; the pack-page SSR seeds it via `initialData`. The packs page is
 * sized to AUTHOR_PACKS_PAGE_SIZE so it seeds the "Load more" infinite query
 * (AuthorPackList) directly — the rest load on demand.
 */
export async function getAuthor(authorId: string): Promise<AuthorData> {
  const [profile, packs] = await Promise.all([
    usersClient.getProfile(authorId),
    packsClient.list({ authorId, limit: AUTHOR_PACKS_PAGE_SIZE }),
  ]);
  return { profile, packs: packs.items, packsTotal: packs.total };
}
