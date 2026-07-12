"use client";

import { useTranslations } from "next-intl";
import { packsClient } from "@/src/shared/lib/packs-client";
import { VoteControl } from "@/src/shared/components/VoteControl";

/**
 * Pack like/dislike voter — a thin wrapper that wires {@link VoteControl} to the
 * packs API and pack-namespaced labels. The visual/behaviour is shared with the
 * feedback voter so scores look identical everywhere.
 */
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

  return (
    <VoteControl
      vote={(value) => packsClient.vote(packId, value)}
      initialLikes={initialLikes}
      initialDislikes={initialDislikes}
      initialMyVote={initialMyVote}
      upvoteLabel={t("upvote")}
      downvoteLabel={t("downvote")}
      blockedReason={tAuth("logInToVote")}
      errorLabel={t("voteError")}
    />
  );
}
