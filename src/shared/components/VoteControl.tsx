"use client";

import type { ReactElement } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import {
  useVoteMutation,
  type VoteTally,
} from "@/src/shared/api/vote.mutations";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { cn } from "@/src/shared/lib/cn";

export interface VoteControlProps {
  /** Casts a vote and resolves to the new server tally, e.g.
   * `(value) => packsClient.vote(id, value)`. */
  vote: (value: 1 | -1) => Promise<VoteTally>;
  initialLikes: number;
  initialDislikes: number;
  initialMyVote: 1 | -1 | null;
  /** aria-labels for the arrows (e.g. "Upvote"/"Like"). */
  upvoteLabel: string;
  downvoteLabel: string;
  /** Tooltip shown to a signed-out viewer over the disabled arrows. */
  blockedReason: string;
  /** Inline message shown when a vote request fails. */
  errorLabel: string;
  className?: string;
}

/**
 * The single, shared like/dislike voter used across packs and feedback. A
 * compact pill: an up arrow with the likes count beneath it, the net score
 * (likes − dislikes) in the middle, and a down arrow with the dislikes count
 * beneath it. The arrow (and its count) light up in the accent colour for your
 * upvote / red for your downvote. Anonymous viewers see it disabled with a
 * reason tooltip rather than a surprise sign-in redirect — the vote itself is a
 * no-op via {@link useVoteMutation}.
 */
export function VoteControl({
  vote,
  initialLikes,
  initialDislikes,
  initialMyVote,
  upvoteLabel,
  downvoteLabel,
  blockedReason,
  errorLabel,
  className,
}: VoteControlProps) {
  const voter = useVoteMutation(vote);

  // Once the viewer has voted, show the server tally wholesale; before that,
  // the initial props. (`myVote` can be null after a toggle-off, so key off the
  // tally's presence rather than `??`.)
  const tally = voter.result;
  const likes = tally ? tally.likes : initialLikes;
  const dislikes = tally ? tally.dislikes : initialDislikes;
  const myVote = tally ? tally.myVote : initialMyVote;
  const score = likes - dislikes;
  const busy = voter.isPending;
  const blocked = voter.blocked;
  const error = voter.isError ? errorLabel : "";

  const withReason = (node: ReactElement) =>
    blocked ? <Tooltip content={blockedReason}>{node}</Tooltip> : node;

  function arrow(direction: "up" | "down") {
    const active = myVote === (direction === "up" ? 1 : -1);
    const Icon = direction === "up" ? ArrowUp : ArrowDown;
    const count = direction === "up" ? likes : dislikes;
    const activeColor = direction === "up" ? "text-acc" : "text-danger";
    return (
      <div className="flex flex-col items-center gap-0.5">
        {withReason(
          <button
            type="button"
            aria-label={direction === "up" ? upvoteLabel : downvoteLabel}
            aria-pressed={active}
            aria-disabled={blocked || undefined}
            disabled={busy}
            onClick={() => voter.cast(direction === "up" ? 1 : -1)}
            className={cn(
              "flex h-7 w-8 items-center justify-center rounded-[7px] transition-colors disabled:opacity-50",
              blocked && "cursor-not-allowed opacity-50",
              active
                ? activeColor
                : "text-foreground-tertiary hover:bg-white/[0.05] hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>,
        )}
        <span
          className={cn(
            "text-[10px] leading-none tabular-nums",
            active ? activeColor : "text-foreground-tertiary",
          )}
        >
          {count}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      <div className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-white/[0.03] px-1.5 py-1">
        {arrow("up")}
        <span
          className={cn(
            "min-w-[1.75rem] text-center text-sm font-semibold tabular-nums",
            myVote === 1
              ? "text-acc"
              : myVote === -1
                ? "text-danger"
                : "text-foreground",
          )}
        >
          {score}
        </span>
        {arrow("down")}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
