"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { packsClient } from "@/src/shared/lib/packs-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import { VoteControl } from "@/src/shared/components/VoteControl";

/**
 * Pack like/dislike voter — a thin wrapper that wires {@link VoteControl} to the
 * packs API and pack-namespaced labels. The visual/behaviour is shared with the
 * feedback voter so scores look identical everywhere.
 *
 * The pack detail page is server-rendered, and `getPackServer` fetches
 * anonymously (it has no access token — that lives in client memory), so
 * `initialMyVote` is always null on first paint even for a signed-in viewer who
 * already voted. Without correction the like renders grey after every refresh.
 * So when the viewer is authenticated we re-fetch the pack as them — the same
 * escape hatch `usePackFallback` uses — and feed the recovered tally in as the
 * pre-vote baseline. Once the viewer casts a vote this session, VoteControl's
 * own server tally takes over and this baseline no longer matters.
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
  const { status } = useAuth();

  const { data } = useQuery({
    queryKey: ["pack-viewer-vote", packId],
    queryFn: () => packsClient.getById(packId),
    // An anonymous viewer's re-fetch would return the same voteless data the
    // SSR fetch already did, so skip it entirely.
    enabled: status === "authenticated",
  });

  return (
    <VoteControl
      vote={(value) => packsClient.vote(packId, value)}
      // `data ? … : initial` rather than `??`: a recovered myVote of null (the
      // viewer genuinely hasn't voted) is a real value, not a miss to fall back
      // from.
      initialLikes={data ? data.likes : initialLikes}
      initialDislikes={data ? data.dislikes : initialDislikes}
      initialMyVote={data ? data.myVote : initialMyVote}
      upvoteLabel={t("upvote")}
      downvoteLabel={t("downvote")}
      blockedReason={tAuth("logInToVote")}
      errorLabel={t("voteError")}
    />
  );
}
