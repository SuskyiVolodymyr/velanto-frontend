"use client";

import type { ReactElement } from "react";
import { Heart, ThumbsDown } from "lucide-react";
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
  /** aria-labels for the two reactions (e.g. "Upvote"/"Like"). */
  upvoteLabel: string;
  downvoteLabel: string;
  /** Tooltip shown to a signed-out viewer over the disabled reactions. */
  blockedReason: string;
  /** Inline message shown when a vote request fails. */
  errorLabel: string;
  /**
   * Wrap the pair in a bordered 38px control. Use it where the vote is the
   * subject's own score sitting among other page-level actions (the pack
   * header's Share/Report row, a suggestion's header) — bare reactions get
   * lost between two framed buttons. Comment threads leave it off, so the
   * reactions read as one more text action beside Reply.
   */
  framed?: boolean;
  className?: string;
}

/**
 * The single like/dislike control used everywhere a pack, a suggestion or a
 * comment is voted on: a heart with its like count and a thumbs-down with its
 * dislike count, as two bare text actions — the comment-thread treatment from
 * Pack Detail.dc.html, applied to every surface so a score reads the same
 * wherever you meet it.
 *
 * Each reaction shows its own count rather than a shared net. A net hides its
 * own composition — 0 from one up and one down used to render identically to 0
 * from nobody voting — and the boxed net-score pill this replaced was the
 * odd one out against every other control on the page.
 *
 * Your own reaction is filled and tinted (magenta for a like, plain foreground
 * for a dislike); `aria-pressed` carries the same state for assistive tech.
 * Anonymous viewers see it disabled with a reason tooltip rather than a
 * surprise sign-in redirect — the vote itself is a no-op via
 * {@link useVoteMutation}.
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
  framed = false,
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
  const busy = voter.isPending;
  const blocked = voter.blocked;
  const error = voter.isError ? errorLabel : "";

  const withReason = (node: ReactElement) =>
    blocked ? <Tooltip content={blockedReason}>{node}</Tooltip> : node;

  function reaction(direction: "up" | "down") {
    const up = direction === "up";
    const active = myVote === (up ? 1 : -1);
    const Glyph = up ? Heart : ThumbsDown;
    return withReason(
      <button
        type="button"
        aria-label={up ? upvoteLabel : downvoteLabel}
        aria-pressed={active}
        aria-disabled={blocked || undefined}
        disabled={busy}
        onClick={() => voter.cast(up ? 1 : -1)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] font-[650] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
          "disabled:cursor-not-allowed disabled:opacity-50",
          framed ? "text-[13px]" : "text-xs",
          blocked && "cursor-not-allowed opacity-50",
          active
            ? up
              ? "text-hot"
              : "text-foreground"
            : up
              ? "text-foreground-tertiary hover:text-hot"
              : "text-foreground-tertiary hover:text-foreground",
        )}
      >
        <Glyph
          aria-hidden
          className={framed ? "h-[15px] w-[15px]" : "h-[13px] w-[13px]"}
          strokeWidth={1.9}
          // Filled while it's your reaction — the fill, not just the hue, is
          // what reads as "pressed" on a 13px glyph.
          fill={active ? "currentColor" : "none"}
        />
        <span className="font-mono tabular-nums">{up ? likes : dislikes}</span>
      </button>,
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <div
        className={cn(
          "inline-flex items-center",
          framed
            ? "h-[38px] gap-4 rounded-control border border-border bg-surface-card px-3.5"
            : "gap-3.5",
        )}
      >
        {reaction("up")}
        {reaction("down")}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
