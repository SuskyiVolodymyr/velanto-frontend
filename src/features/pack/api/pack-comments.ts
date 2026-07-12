import {
  commentsClient,
  type CommentSort,
} from "@/src/shared/lib/comments-client";

export const PACK_COMMENTS_PAGE_SIZE = 10;

/** Fetch function (no React) for one page of a pack's comments. */
export function fetchPackCommentsPage(
  packId: string,
  page: number,
  sort: CommentSort,
) {
  return commentsClient.list(packId, {
    page,
    limit: PACK_COMMENTS_PAGE_SIZE,
    sort,
  });
}
