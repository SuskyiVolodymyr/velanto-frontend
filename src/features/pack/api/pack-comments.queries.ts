"use client";

import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  commentsClient,
  type CommentSort,
} from "@/src/shared/lib/comments-client";
import type { Comment } from "@/src/shared/types/comment";
import { fetchPackCommentsPage } from "./pack-comments";

type PackCommentsPage = Awaited<ReturnType<typeof commentsClient.list>>;
type PackCommentsData = InfiniteData<PackCommentsPage, number>;

export function packCommentsQueryOptions(packId: string, sort: CommentSort) {
  return infiniteQueryOptions({
    // The sort is part of the key: switching Top/New is a distinct query the
    // mutations below must also target so they patch the visible list.
    queryKey: ["pack-comments", packId, sort] as const,
    queryFn: ({ pageParam }) => fetchPackCommentsPage(packId, pageParam, sort),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (count, page) => count + page.items.length,
        0,
      );
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
  });
}

export function usePackComments(packId: string, sort: CommentSort) {
  return useInfiniteQuery(packCommentsQueryOptions(packId, sort));
}

/**
 * Post a root comment; prepends the created comment into the first cached page
 * and bumps every page's total, so the thread updates without a refetch.
 */
export function useAddPackComment(packId: string, sort: CommentSort) {
  const queryClient = useQueryClient();
  const { queryKey } = packCommentsQueryOptions(packId, sort);
  return useMutation({
    mutationFn: (body: string) => commentsClient.create(packId, { body }),
    onSuccess: (created) => {
      queryClient.setQueryData<PackCommentsData>(queryKey, (old) => {
        if (!old || old.pages.length === 0) return old;
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [
            {
              ...first,
              items: [created, ...first.items],
              total: first.total + 1,
            },
            ...rest.map((page) => ({ ...page, total: page.total + 1 })),
          ],
        };
      });
    },
  });
}

/**
 * Post a reply to a root comment. `parentId` is a mutation variable (not a
 * hook argument) so a single instance serves every root's inline composer.
 * The created reply is appended to its root's `replies` (oldest-first, mirror
 * of the backend order) and that root's `replyCount` is bumped; the roots-only
 * `total` is untouched.
 */
export function useReplyToComment(packId: string, sort: CommentSort) {
  const queryClient = useQueryClient();
  const { queryKey } = packCommentsQueryOptions(packId, sort);
  return useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId: string }) =>
      commentsClient.create(packId, { body, parentId }),
    onSuccess: (created, { parentId }) => {
      queryClient.setQueryData<PackCommentsData>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((root) =>
              root.id === parentId ? appendReply(root, created) : root,
            ),
          })),
        };
      });
    },
  });
}

function appendReply(root: Comment, reply: Comment): Comment {
  const replies = root.replies ?? [];
  return {
    ...root,
    replies: [...replies, reply],
    replyCount: (root.replyCount ?? replies.length) + 1,
  };
}

/**
 * Delete a pack comment. A deleted ROOT is removed from its page and every
 * page's total is decremented; a deleted REPLY is dropped from its root's
 * `replies` and that root's `replyCount` decremented (roots-only total
 * unchanged). Which one it is is derived from the cache. The mutation variable
 * is the comment id, so callers can spin only the row being deleted via
 * `mutation.variables`.
 */
export function useDeletePackComment(packId: string, sort: CommentSort) {
  const queryClient = useQueryClient();
  const { queryKey } = packCommentsQueryOptions(packId, sort);
  return useMutation({
    mutationFn: (commentId: string) => commentsClient.delete(packId, commentId),
    onSuccess: (_result, commentId) => {
      queryClient.setQueryData<PackCommentsData>(queryKey, (old) => {
        if (!old) return old;
        const isRoot = old.pages.some((page) =>
          page.items.some((comment) => comment.id === commentId),
        );
        return {
          ...old,
          pages: old.pages.map((page) =>
            isRoot
              ? {
                  ...page,
                  items: page.items.filter((c) => c.id !== commentId),
                  total: Math.max(0, page.total - 1),
                }
              : {
                  ...page,
                  items: page.items.map((root) => removeReply(root, commentId)),
                },
          ),
        };
      });
    },
  });
}

function removeReply(root: Comment, replyId: string): Comment {
  const replies = root.replies ?? [];
  if (!replies.some((reply) => reply.id === replyId)) return root;
  return {
    ...root,
    replies: replies.filter((reply) => reply.id !== replyId),
    replyCount: Math.max(0, (root.replyCount ?? replies.length) - 1),
  };
}
