"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  tokensClient,
  type CreateTokenInput,
} from "@/src/shared/lib/tokens-client";

export function tokensQueryOptions() {
  return queryOptions({
    queryKey: ["api-tokens"] as const,
    queryFn: () => tokensClient.list(),
  });
}

/** The caller's Personal Access Tokens; gate with `enabled` (auth-only). */
export function useApiTokens({ enabled }: { enabled: boolean }) {
  return useQuery({ ...tokensQueryOptions(), enabled });
}

/** Mint a token; the plaintext secret is in the returned data (shown once). */
export function useCreateToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTokenInput) => tokensClient.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
  });
}

/** Revoke a token by id; refreshes the list on success. */
export function useRevokeToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tokensClient.revoke(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
  });
}
