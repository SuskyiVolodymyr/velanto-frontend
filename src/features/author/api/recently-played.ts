import { usersClient } from "@/shared/api/users-client";
import type { PackList } from "@/shared/api/packs-client";
import type { RecentlyPlayedPack } from "@/shared/types/pack";

// One page of a user's recently-played packs. The section is a horizontal
// scroller that appends the next page as it nears the end, so the page size is
// small — enough to fill the row and give the scroller headroom.
export const RECENTLY_PLAYED_PAGE_SIZE = 8;

export function fetchRecentlyPlayedPage(
  userId: string,
  page: number,
): Promise<PackList<RecentlyPlayedPack>> {
  return usersClient.recentlyPlayed(userId, {
    page,
    limit: RECENTLY_PLAYED_PAGE_SIZE,
  });
}
