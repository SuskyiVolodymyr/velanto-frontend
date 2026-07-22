"use client";

import { useTranslations } from "next-intl";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { RankResultScreen } from "@/src/features/result/RankResultScreen";
import { HeadToHeadResultScreen } from "@/src/features/result/HeadToHeadResultScreen";
import { NxNResultScreen } from "@/src/features/result/NxNResultScreen";
import { EliminationResultScreen } from "@/src/features/result/EliminationResultScreen";
import { ResultLocked } from "@/src/features/result/ResultLocked";
import { usePackResults } from "@/src/features/result/api/results.queries";
import { useResultPicks } from "@/src/features/result/use-result-picks";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";

/**
 * #222: the community breakdown is gated on evidence that you finished this
 * pack — otherwise the promise that "stats unlock after you finish" was just
 * copy, and any /result URL spoiled the crowd's picks before you played.
 *
 * Evidence is a local record of your play, or a `?p=` share code (someone
 * handing you their result on purpose — gating that would break sharing).
 * Both come from useResultPicks, so this is the same signal the "your pick"
 * highlight already used; it is now load-bearing rather than decorative.
 *
 * #243: the results are fetched HERE rather than handed down from the Server
 * Component. The gate's evidence is client-only (sessionStorage), so the server
 * cannot know whether the numbers will be shown — it was fetching them for
 * everyone and discarding them for anyone locked out. Fetching under the same
 * condition that displays them means a locked visitor makes no request at all.
 */
export function ResultScreen({ pack }: { pack: Pack }) {
  const { picks, shared, ready } = useResultPicks(pack.id);
  const hasEvidence = ready && picks !== null;
  const { data: results, isError } = usePackResults(pack.id, hasEvidence);
  const t = useTranslations("result");

  // Not "no play" — the sessionStorage read hasn't happened yet. Rendering the
  // locked state here would flash it at every player before their own results.
  if (!ready) return <LoadingState label={t("loading")} />;
  if (!picks) return <ResultLocked packId={pack.id} title={pack.title} />;

  // Evidence exists, so the numbers are coming. A spinner rather than the
  // locked state: telling someone who just finished that they haven't played
  // reads as broken, which is the same reason `!ready` isn't locked either.
  if (isError) return <ResultLoadError />;
  if (!results) return <LoadingState label={t("loading")} />;

  // picks/shared are PASSED DOWN, not re-read. Both child screens used to call
  // useResultPicks themselves, which gave each its own copy of the hook's
  // after-mount state: they rendered once with picks=null (the aggregate list),
  // then again once their own effect resolved (the "your pick" row). That is a
  // real flash of the crowd's numbers before your own pick, and it is what
  // #222's gate exists to prevent — the parent has already done this read.
  if (results.format === "rank_blind") {
    return (
      <RankResultScreen
        pack={pack}
        results={results}
        ownPicks={picks}
        shared={shared}
      />
    );
  }
  // The versus formats each get their own screen: their rounds are randomly
  // drawn matchups, which GroupResultScreen's per-round tally of a shared
  // candidate list cannot express. nxn replays the sides you were shown; 1v1
  // adds the crowd's split for that exact pairing (see NxNResultScreen on why
  // nxn has no percentages).
  if (results.format === "nxn") {
    return (
      <NxNResultScreen
        pack={pack}
        results={results}
        ownPicks={picks}
        shared={shared}
      />
    );
  }
  if (results.format === "1v1") {
    return (
      <HeadToHeadResultScreen
        pack={pack}
        results={results}
        ownPicks={picks}
        shared={shared}
      />
    );
  }
  // save_one / sacrifice_one. Same recap shape as the versus screens: the
  // rounds you played, each as the slate it drew, with your pick marked.
  return (
    <EliminationResultScreen
      pack={pack}
      results={results}
      ownPicks={picks}
      shared={shared}
    />
  );
}

/**
 * The request failed after we already know the person played. Distinct from
 * ResultLocked on purpose — they earned the numbers, so "finish the pack first"
 * would be a lie about why the screen is empty.
 */
function ResultLoadError() {
  const t = useTranslations("result");
  return (
    <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>
      <Card className="py-10 text-center hover:translate-y-0 hover:shadow-none">
        <Text variant="danger">{t("loadError")}</Text>
      </Card>
    </div>
  );
}
