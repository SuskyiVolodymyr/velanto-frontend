import {
  usersClient,
  type FollowUserPage,
} from "@/src/shared/lib/users-client";

export const PEOPLE_SEARCH_PAGE_SIZE = 20;

/**
 * One page of the people directory. An empty `q` is no longer a doomed
 * request: it asks for every active account, alphabetically, which is what
 * /people shows before you type anything. The backend used to 400 below two
 * characters and the UI mirrored that floor as `MIN_SEARCH_LENGTH`; both are
 * gone — see the backend's `searchUsersQuerySchema` for why.
 */
export function getUserSearch(
  q: string,
  page: number,
): Promise<FollowUserPage> {
  return usersClient.search(q || undefined, {
    // Page 1 is the backend default — omit it so the request stays canonical.
    page: page > 1 ? page : undefined,
    limit: PEOPLE_SEARCH_PAGE_SIZE,
  });
}
