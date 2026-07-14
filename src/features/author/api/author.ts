import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { PublicUserProfile } from "@/src/shared/types/user";
import type { Pack } from "@/src/shared/types/pack";
import { AUTHOR_PACKS_PAGE_SIZE } from "./author-packs";

export interface AuthorData {
  profile: PublicUserProfile;
  packs: Pack[];
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
