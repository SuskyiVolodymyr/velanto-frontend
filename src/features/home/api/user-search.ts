import {
  usersClient,
  type FollowUserPage,
} from "@/src/shared/lib/users-client";

export const PEOPLE_SEARCH_PAGE_SIZE = 20;

/**
 * Shortest query the backend accepts (its DTO 400s below this). The UI gates on
 * the same floor so a 1-character query never fires a doomed request. Keep in
 * sync with the backend `searchUsersQuerySchema`.
 */
export const MIN_SEARCH_LENGTH = 2;

export function getUserSearch(
  q: string,
  page: number,
): Promise<FollowUserPage> {
  return usersClient.search(q, {
    // Page 1 is the backend default — omit it so the request stays canonical.
    page: page > 1 ? page : undefined,
    limit: PEOPLE_SEARCH_PAGE_SIZE,
  });
}
