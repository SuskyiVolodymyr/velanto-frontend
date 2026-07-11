"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useVoteMutation } from "@/src/shared/api/vote.mutations";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Tooltip } from "@/src/shared/components/Tooltip";

export function FeedbackVote({
  feedbackId,
  initialScore,
  initialLikes,
  initialDislikes,
  initialMyVote,
}: {
  feedbackId: string;
  initialScore: number;
  initialLikes: number;
  initialDislikes: number;
  initialMyVote: 1 | -1 | null;
}) {
  const t = useTranslations("feedback");
  const tAuth = useTranslations("authGate");
  const vote = useVoteMutation((value) =>
    feedbackClient.vote(feedbackId, value),
  );

  // Once the viewer has voted, show the server tally wholesale; before that, the
  // initial props. (`myVote` can be null after a toggle-off, so use the tally's
  // presence rather than `??`.)
  const tally = vote.result;
  const score = tally ? tally.score : initialScore;
  const likes = tally ? tally.likes : initialLikes;
  const dislikes = tally ? tally.dislikes : initialDislikes;
  const myVote = tally ? tally.myVote : initialMyVote;
  const busy = vote.isPending;
  const blocked = vote.blocked;
  const error = vote.isError ? t("voteError") : "";

  // A blocked (anonymous) viewer sees the buttons dimmed and non-functional,
  // with the reason on hover/focus, rather than a surprise sign-in redirect.
  const blockReason = tAuth("logInToVote");
  const withReason = (node: ReactElement) =>
    blocked ? <Tooltip content={blockReason}>{node}</Tooltip> : node;

  return (
    <div className="flex items-center gap-3">
      <span className="flex flex-col items-center rounded-[8px] bg-white/[0.04] px-3 py-1.5">
        <span className="text-base font-semibold text-foreground">{score}</span>
        <span className="text-[10px] uppercase tracking-wide text-foreground-tertiary">
          {t("scoreLabel")}
        </span>
      </span>
      {withReason(
        <Button
          variant={myVote === 1 ? "primary" : "secondary"}
          aria-disabled={blocked || undefined}
          disabled={busy}
          className={blocked ? "cursor-not-allowed opacity-45" : undefined}
          onClick={() => vote.cast(1)}
        >
          {t("like")} <span>{likes}</span>
        </Button>,
      )}
      {withReason(
        <Button
          variant={myVote === -1 ? "primary" : "secondary"}
          aria-disabled={blocked || undefined}
          disabled={busy}
          className={blocked ? "cursor-not-allowed opacity-45" : undefined}
          onClick={() => vote.cast(-1)}
        >
          {t("dislike")} <span>{dislikes}</span>
        </Button>,
      )}
      {error && <Text className="text-xs text-[#ff6b6b]">{error}</Text>}
    </div>
  );
}
