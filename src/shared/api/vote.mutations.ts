"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";

export interface VoteTally {
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
}

export interface UseVoteMutationResult<T extends VoteTally> {
  /** The latest server tally, or undefined before the viewer has voted. */
  result: T | undefined;
  isPending: boolean;
  isError: boolean;
  /** Cast a vote; anonymous viewers are redirected to sign in instead. */
  cast: (value: 1 | -1) => void;
}

/**
 * Shared up/down vote mutation, reused by the pack and feedback voters. The
 * caller passes the vote fn (`(value) => xClient.vote(id, value)`); `result` is
 * the latest server tally to display over the initial props (use it wholesale —
 * `myVote` can legitimately be `null` after a toggle-off, so don't `??` it).
 * Anonymous viewers are redirected to sign in rather than mutating.
 */
export function useVoteMutation<T extends VoteTally>(
  vote: (value: 1 | -1) => Promise<T>,
): UseVoteMutationResult<T> {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mutation = useMutation({ mutationFn: vote });

  return {
    result: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
    cast: (value) => {
      if (status !== "authenticated") {
        router.push(`/auth?next=${encodeURIComponent(pathname)}`);
        return;
      }
      mutation.mutate(value);
    },
  };
}
