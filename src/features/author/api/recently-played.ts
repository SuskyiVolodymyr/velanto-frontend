import { usersClient } from "@/src/shared/lib/users-client";
import type { PackList } from "@/src/shared/lib/packs-client";

// One page of a user's recently-played packs. The section is a horizontal
// scroller that appends the next page as it nears the end, so the page size is
// small — enough to fill the row and give the scroller headroom.
export const RECENTLY_PLAYED_PAGE_SIZE = 8;

export function fetchRecentlyPlayedPage(
  userId: string,
  page: number,
): Promise<PackList> {
  return usersClient.recentlyPlayed(userId, {
    page,
    limit: RECENTLY_PLAYED_PAGE_SIZE,
  });
}
