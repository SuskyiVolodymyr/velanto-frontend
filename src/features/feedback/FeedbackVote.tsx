"use client";

import { useTranslations } from "next-intl";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { VoteControl } from "@/src/shared/components/VoteControl";

/**
 * Feedback like/dislike voter — a thin wrapper that wires {@link VoteControl} to
 * the feedback API and feedback-namespaced labels, so a feedback post's score
 * looks and behaves exactly like a pack's. Net score is derived from
 * likes − dislikes inside {@link VoteControl}, so no separate score prop.
 */
export function FeedbackVote({
  feedbackId,
  initialLikes,
  initialDislikes,
  initialMyVote,
}: {
  feedbackId: string;
  initialLikes: number;
  initialDislikes: number;
  initialMyVote: 1 | -1 | null;
}) {
  const t = useTranslations("feedback");
  const tAuth = useTranslations("authGate");

  return (
    <VoteControl
      vote={(value) => feedbackClient.vote(feedbackId, value)}
      initialLikes={initialLikes}
      initialDislikes={initialDislikes}
      initialMyVote={initialMyVote}
      upvoteLabel={t("like")}
      downvoteLabel={t("dislike")}
      blockedReason={tAuth("logInToVote")}
      errorLabel={t("voteError")}
    />
  );
}
