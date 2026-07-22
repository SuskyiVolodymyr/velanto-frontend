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
  /** Visual density. "sm" is a tighter pill for comment threads; default "md". */
  size?: "sm" | "md";
  /**
   * Shape. "stacked" (default) is the boxed pill — arrows above their own
   * counts, framed by a border. "inline" is the chrome-free row used in the
   * comment thread: arrow, net score, arrow on one line with no box and no
   * per-direction counts, so it can sit beside "Reply" without reading as a
   * second container. Opt in explicitly; "stacked" stays the default so the
   * pack and feedback voters are untouched.
   */
  layout?: "stacked" | "inline";
  className?: string;
}

/**
 * The single, shared like/dislike voter used across packs and feedback. A
 * compact pill: an up arrow with the likes count beneath it, the net score
 * (likes − dislikes) in the middle, and a down arrow with the dislikes count
 * beneath it. The arrow (and its count) light up in the accent colour for your
 * upvote / red for your downvote. Anonymous viewers see it disabled with a
 * reason tooltip rather than a surprise sign-in redirect — the vote itself is a
 * no-op via {@link useVoteMutation}. `layout="inline"` swaps the pill for a bare
 * horizontal row (see {@link VoteControlProps.layout}).
 *
 * Note for maintainers: `cn` here is a plain joiner, **not** tailwind-merge, so
 * a later class does not beat an earlier one. Every property that differs
 * between the two layouts is therefore chosen by a branch that emits exactly one
 * value — never by appending an override.
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
  size = "md",
  layout = "stacked",
  className,
}: VoteControlProps) {
  const voter = useVoteMutation(vote);
  const sm = size === "sm";
  const inline = layout === "inline";

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
    const button = withReason(
      <button
        type="button"
        aria-label={direction === "up" ? upvoteLabel : downvoteLabel}
        aria-pressed={active}
        aria-disabled={blocked || undefined}
        disabled={busy}
        onClick={() => voter.cast(direction === "up" ? 1 : -1)}
        className={cn(
          "flex items-center justify-center rounded-[7px] transition-colors disabled:opacity-50",
          inline ? "h-6 w-6" : sm ? "h-6 w-7" : "h-7 w-8",
          blocked && "cursor-not-allowed opacity-50",
          active
            ? activeColor
            : inline
              ? // No hover tint inline: a filled square behind a bare arrow
                // would reinstate the box this layout exists to remove.
                "text-foreground-tertiary hover:text-acc"
              : "text-foreground-tertiary hover:bg-white/[0.05] hover:text-foreground",
        )}
      >
        <Icon
          aria-hidden
          className={inline || sm ? "h-[15px] w-[15px]" : "h-[18px] w-[18px]"}
          strokeWidth={2.2}
        />
      </button>,
    );
    // Inline shows one number for the whole control (the net score), so an
    // arrow is just the arrow — no column, no per-direction count.
    if (inline) return button;
    return (
      <div className="flex flex-col items-center gap-0.5">
        {button}
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

  // Sign, not stance. The number is the COMMENT's standing, so it has to read
  // the same for everyone looking at it; which way *you* voted is carried by
  // the arrow tint and by aria-pressed, which is where a personal state
  // belongs. Colouring it by myVote conflated the two: a score of 0 you had
  // downvoted looked identical to a score of 0 that was genuinely negative,
  // and a -4 read as neutral until you happened to vote on it.
  const scoreColor =
    score > 0
      ? "text-acc"
      : score < 0
        ? "text-danger"
        : "text-foreground-secondary";

  if (inline) {
    return (
      <div className={cn("flex flex-col items-start gap-1", className)}>
        <div className="inline-flex items-center gap-0.5">
          {arrow("up")}
          {/* The net hides its own composition: 0 from 1↑/1↓ looks identical
              to 0 from nobody voting. The stacked pill shows both counts
              beside their arrows; inline has no room, so the breakdown lives
              in the title instead of being lost. */}
          <span
            title={`${likes} up · ${dislikes} down`}
            className={cn("text-xs font-semibold tabular-nums", scoreColor)}
          >
            {score}
          </span>
          {arrow("down")}
        </div>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-1.5", className)}>
      <div
        className={cn(
          "inline-flex items-center rounded-[10px] border border-border bg-white/[0.03]",
          sm ? "gap-1 px-1 py-0.5" : "gap-1.5 px-1.5 py-1",
        )}
      >
        {arrow("up")}
        <span
          className={cn(
            "text-center font-semibold tabular-nums",
            sm ? "min-w-[1.5rem] text-xs" : "min-w-[1.75rem] text-sm",
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
