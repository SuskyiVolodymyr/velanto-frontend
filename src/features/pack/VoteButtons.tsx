"use client";

import type { ReactElement } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useVoteMutation } from "@/src/shared/api/vote.mutations";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { cn } from "@/src/shared/lib/cn";

function Arrow({ direction }: { direction: "up" | "down" }) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />;
}

// Compact up / score / down voter. The net score (likes − dislikes) sits
// between the arrows; the arrow matching your vote lights up (accent for up,
// red for down).
export function VoteButtons({
  packId,
  initialLikes,
  initialDislikes,
  initialMyVote,
}: {
  packId: string;
  initialLikes: number;
  initialDislikes: number;
  initialMyVote: 1 | -1 | null;
}) {
  const t = useTranslations("pack");
  const tAuth = useTranslations("authGate");
  const vote = useVoteMutation((value) => packsClient.vote(packId, value));

  // Once the viewer has voted, show the server tally wholesale; before that, the
  // initial props. (`myVote` can be null after a toggle-off, so use the tally's
  // presence rather than `??`.)
  const tally = vote.result;
  const likes = tally ? tally.likes : initialLikes;
  const dislikes = tally ? tally.dislikes : initialDislikes;
  const myVote = tally ? tally.myVote : initialMyVote;
  const score = likes - dislikes;
  const busy = vote.isPending;
  const blocked = vote.blocked;
  const error = vote.isError ? t("voteError") : "";

  // A blocked (anonymous) viewer sees the arrow dimmed and non-functional, with
  // the reason on hover/focus — never the real `disabled` attribute, or the
  // Tooltip couldn't fire. When signed in it's a plain button.
  const blockReason = tAuth("logInToVote");
  const withReason = (node: ReactElement) =>
    blocked ? <Tooltip content={blockReason}>{node}</Tooltip> : node;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="inline-flex items-center gap-0.5 rounded-[10px] border border-border bg-white/[0.03] p-1">
        {withReason(
          <button
            type="button"
            aria-label={t("upvote")}
            aria-pressed={myVote === 1}
            aria-disabled={blocked || undefined}
            disabled={busy}
            onClick={() => vote.cast(1)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[7px] transition-colors disabled:opacity-50",
              blocked && "cursor-not-allowed opacity-50",
              myVote === 1
                ? "text-acc"
                : "text-foreground-tertiary hover:bg-white/[0.05] hover:text-foreground",
            )}
          >
            <Arrow direction="up" />
          </button>,
        )}
        <span
          className={cn(
            "min-w-[1.75rem] text-center text-sm font-semibold tabular-nums",
            myVote === 1
              ? "text-acc"
              : myVote === -1
                ? "text-[#ff6b6b]"
                : "text-foreground",
          )}
        >
          {score}
        </span>
        {withReason(
          <button
            type="button"
            aria-label={t("downvote")}
            aria-pressed={myVote === -1}
            aria-disabled={blocked || undefined}
            disabled={busy}
            onClick={() => vote.cast(-1)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[7px] transition-colors disabled:opacity-50",
              blocked && "cursor-not-allowed opacity-50",
              myVote === -1
                ? "text-[#ff6b6b]"
                : "text-foreground-tertiary hover:bg-white/[0.05] hover:text-foreground",
            )}
          >
            <Arrow direction="down" />
          </button>,
        )}
      </div>
      {error && <span className="text-xs text-[#ff6b6b]">{error}</span>}
    </div>
  );
}
