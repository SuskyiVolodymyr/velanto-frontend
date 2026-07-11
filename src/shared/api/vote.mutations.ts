"use client";

import { useMutation } from "@tanstack/react-query";
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
  /** True when the viewer isn't signed in — the control should render blocked. */
  blocked: boolean;
  /** Cast a vote; a no-op for a blocked (anonymous) viewer. */
  cast: (value: 1 | -1) => void;
}

/**
 * Shared up/down vote mutation, reused by the pack and feedback voters. The
 * caller passes the vote fn (`(value) => xClient.vote(id, value)`); `result` is
 * the latest server tally to display over the initial props (use it wholesale —
 * `myVote` can legitimately be `null` after a toggle-off, so don't `??` it).
 * Anonymous viewers are `blocked`: `cast` no-ops so the caller can render the
 * control disabled with a reason tooltip rather than firing a surprise redirect.
 */
export function useVoteMutation<T extends VoteTally>(
  vote: (value: 1 | -1) => Promise<T>,
): UseVoteMutationResult<T> {
  const { status } = useAuth();
  const blocked = status !== "authenticated";
  const mutation = useMutation({ mutationFn: vote });

  return {
    result: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
    blocked,
    cast: (value) => {
      if (blocked) return;
      mutation.mutate(value);
    },
  };
}
