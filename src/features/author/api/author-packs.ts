import { packsClient, type PackList } from "@/src/shared/lib/packs-client";

// One page of an author's packs. Small on purpose: the profile leads with a
// handful and reveals the rest on demand via "Load more". Mirrored by the SSR
// seed (get-user-server) and the combined author query (author.ts) so page 1
// they fetch lines up with this infinite query's page size.
export const AUTHOR_PACKS_PAGE_SIZE = 6;

export function fetchAuthorPacksPage(
  authorId: string,
  page: number,
): Promise<PackList> {
  return packsClient.list({
    authorId,
    page,
    limit: AUTHOR_PACKS_PAGE_SIZE,
  });
}
