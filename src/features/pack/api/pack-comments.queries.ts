"use client";

import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { commentsClient } from "@/src/shared/lib/comments-client";
import { fetchPackCommentsPage } from "./pack-comments";

type PackCommentsPage = Awaited<ReturnType<typeof commentsClient.list>>;

export function packCommentsQueryOptions(packId: string) {
  return infiniteQueryOptions({
    queryKey: ["pack-comments", packId] as const,
    queryFn: ({ pageParam }) => fetchPackCommentsPage(packId, pageParam),
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

export function usePackComments(packId: string) {
  return useInfiniteQuery(packCommentsQueryOptions(packId));
}

/**
 * Post a pack comment; prepends the created comment into the first cached page
 * and bumps every page's total, so the thread updates without a refetch.
 */
export function useAddPackComment(packId: string) {
  const queryClient = useQueryClient();
  const { queryKey } = packCommentsQueryOptions(packId);
  return useMutation({
    mutationFn: (body: string) => commentsClient.create(packId, { body }),
    onSuccess: (created) => {
      queryClient.setQueryData<InfiniteData<PackCommentsPage, number>>(
        queryKey,
        (old) => {
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
        },
      );
    },
  });
}
