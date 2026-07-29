"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { BackButton } from "@/src/shared/components/BackButton";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { RankResultScreen } from "@/src/features/result/RankResultScreen";
import { HeadToHeadResultScreen } from "@/src/features/result/HeadToHeadResultScreen";
import { NxNResultScreen } from "@/src/features/result/NxNResultScreen";
import { EliminationResultScreen } from "@/src/features/result/EliminationResultScreen";
import { ResultLocked } from "@/src/features/result/ResultLocked";
import { ResultActions } from "@/src/features/result/ResultActions";
import { ResultHero } from "@/src/features/result/ResultHero";
import { ResultAgainPanel } from "@/src/features/result/ResultAgainPanel";
import { SharedResultNote } from "@/src/features/result/SharedResultNote";
import { summarizeResult } from "@/src/features/result/result-summary";
import { usePackResults } from "@/src/features/result/api/results.queries";
import { useResultPicks } from "@/src/features/result/use-result-picks";
import { getRoundsCount } from "@/src/shared/lib/pack-display";
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

  let body: ReactNode;
  if (!ready) {
    // Not "no play" — the sessionStorage read hasn't happened yet. Rendering
    // the locked state here would flash it at every player before their own
    // results.
    body = <LoadingState label={t("loading")} />;
  } else if (!picks) {
    body = <ResultLocked packId={pack.id} title={pack.title} />;
  } else if (isError) {
    // Evidence exists, so the numbers are coming. A spinner rather than the
    // locked state: telling someone who just finished that they haven't
    // played reads as broken, which is the same reason `!ready` isn't locked
    // either.
    body = <ResultLoadError />;
  } else if (!results) {
    body = <LoadingState label={t("loading")} />;
  } else {
    // picks/shared are PASSED DOWN to the format screen, not re-read. Both
    // child screens used to call useResultPicks themselves, which gave each
    // its own copy of the hook's after-mount state: they rendered once with
    // picks=null (the aggregate list), then again once their own effect
    // resolved (the "your pick" row). That is a real flash of the crowd's
    // numbers before your own pick, and it is what #222's gate exists to
    // prevent — the parent has already done this read.
    let recap: ReactNode;
    if (results.format === "rank_blind") {
      // The versus formats each get their own screen: their rounds are
      // randomly drawn matchups, which a per-round tally of a shared
      // candidate list cannot express. nxn replays the sides you were shown;
      // 1v1 adds the crowd's split for that exact pairing (see
      // NxNResultScreen on why nxn has no percentages).
      recap = (
        <RankResultScreen
          pack={pack}
          results={results}
          ownPicks={picks}
          shared={shared}
        />
      );
    } else if (results.format === "nxn") {
      recap = (
        <NxNResultScreen
          pack={pack}
          results={results}
          ownPicks={picks}
          shared={shared}
        />
      );
    } else if (results.format === "1v1") {
      recap = (
        <HeadToHeadResultScreen
          pack={pack}
          results={results}
          ownPicks={picks}
          shared={shared}
        />
      );
    } else {
      // save_one / sacrifice_one. Same recap shape as the versus screens: the
      // rounds you played, each as the slate it drew, with your pick marked.
      recap = (
        <EliminationResultScreen
          pack={pack}
          results={results}
          ownPicks={picks}
          shared={shared}
        />
      );
    }

    // D5 (T10): the hero's stat tiles, derived here rather than inside
    // ResultHero — the hero is presentational, this screen already has
    // format/ownPicks/results in scope, and it is the same "derive once at
    // the composition root" shape #222's picks/shared already follow above.
    const { tiles } = summarizeResult({
      ownPicks: picks,
      results,
    });

    body = (
      <>
        <div className={cn(PACK_CONTAINER, "pt-10")}>
          <ResultHero
            packTitle={pack.title}
            format={results.format}
            shared={shared}
            totalRounds={getRoundsCount(pack)}
            totalPlays={results.totalPlays}
            tiles={tiles}
          />
          {shared && <SharedResultNote />}
        </div>
        {/* T8: recap (left) + a right aside for 2-3 stacked cards (the
            leaderboard, T11; the share/play-again card, T12) — the mock's
            `minmax(0,1fr) minmax(0,330px)` grid. The hero stays full-width
            above this, not inside either column. Single column below `lg`. */}
        <div
          className={cn(
            PACK_CONTAINER,
            "grid grid-cols-1 items-start gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)]",
          )}
        >
          <div className="min-w-0">{recap}</div>
          <aside className="flex flex-col gap-4">
            {/* T11's leaderboard card renders inside `recap` itself (see that
                task's commit for why); T12's consolidated share/play-again
                card is the aside's own content. */}
            <ResultAgainPanel
              packId={pack.id}
              status={pack.status}
              picks={picks}
              shared={shared}
            />
          </aside>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Sticky action bar (T11): same treatment as PackDetailScreen's — back
          on the start side, ResultActions on the end. BackButton moved here
          from app/packs/[id]/result/page.tsx's loose <div> so it's always
          visible, matching every other state this screen can render.
          ResultActions is centralized here instead of being duplicated by
          each of the four format screens (each used to render its own copy
          with `className="mb-6 justify-end"`) — it renders in exactly the
          states that used to render it: once results are actually on screen.
          Locked/loading/error keep whatever CTA they already had (or none);
          that is untouched #222 gate behaviour, not something T11 changes. */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-7 py-3 backdrop-blur-md max-[720px]:px-4">
        <BackButton href={`/packs/${pack.id}`} />
        {picks && !isError && results && (
          <ResultActions
            packId={pack.id}
            shared={shared}
            className="ms-auto"
          />
        )}
      </div>
      {body}
    </>
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
      <div className="rounded-card border border-border bg-surface-card p-[26px_24px] text-center">
        <Text variant="danger">{t("loadError")}</Text>
      </div>
    </div>
  );
}
