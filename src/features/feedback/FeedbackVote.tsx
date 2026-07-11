"use client";

import { useTranslations } from "next-intl";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { useVoteMutation } from "@/src/shared/api/vote.mutations";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";

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
  const vote = useVoteMutation((value) => feedbackClient.vote(feedbackId, value));

  // Once the viewer has voted, show the server tally wholesale; before that, the
  // initial props. (`myVote` can be null after a toggle-off, so use the tally's
  // presence rather than `??`.)
  const tally = vote.result;
  const score = tally ? tally.score : initialScore;
  const likes = tally ? tally.likes : initialLikes;
  const dislikes = tally ? tally.dislikes : initialDislikes;
  const myVote = tally ? tally.myVote : initialMyVote;
  const busy = vote.isPending;
  const error = vote.isError ? t("voteError") : "";

  return (
    <div className="flex items-center gap-3">
      <span className="flex flex-col items-center rounded-[8px] bg-white/[0.04] px-3 py-1.5">
        <span className="text-base font-semibold text-foreground">{score}</span>
        <span className="text-[10px] uppercase tracking-wide text-foreground-tertiary">
          {t("scoreLabel")}
        </span>
      </span>
      <Button
        variant={myVote === 1 ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => vote.cast(1)}
      >
        {t("like")} <span>{likes}</span>
      </Button>
      <Button
        variant={myVote === -1 ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => vote.cast(-1)}
      >
        {t("dislike")} <span>{dislikes}</span>
      </Button>
      {error && <Text className="text-xs text-[#ff6b6b]">{error}</Text>}
    </div>
  );
}
