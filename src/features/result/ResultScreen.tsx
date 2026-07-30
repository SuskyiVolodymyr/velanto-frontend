"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { PackHeaderBar } from "@/src/shared/components/PackHeaderBar";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { RankResultScreen } from "@/src/features/result/RankResultScreen";
import { HeadToHeadResultScreen } from "@/src/features/result/HeadToHeadResultScreen";
import { NxNResultScreen } from "@/src/features/result/NxNResultScreen";
import { EliminationResultScreen } from "@/src/features/result/EliminationResultScreen";
import { ResultLocked } from "@/src/features/result/ResultLocked";
import { ResultHero } from "@/src/features/result/ResultHero";
import { ResultAgainPanel } from "@/src/features/result/ResultAgainPanel";
import { SharedResultNote } from "@/src/features/result/SharedResultNote";
import { TopPickedTable } from "@/src/features/result/TopPickedTable";
import { PodiumTable } from "@/src/features/result/PodiumTable";
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
  const tPlay = useTranslations("play");

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

    // Mock (`Results.dc.html`): the pack-wide ranking is an ASIDE card, below
    // the share panel — not inline in the recap column, which is where each
    // format screen used to render its own copy of this. Computed here so
    // ResultScreen owns exactly one rendering of it, keyed to the same
    // `results.format` branch as `recap` above.
    let board: ReactNode = null;
    if (results.format === "rank_blind") {
      const podium = results.podium ?? [];
      if (podium.length > 0) {
        board = (
          <PodiumTable
            items={podium}
            title={t("podiumHeading")}
            note={t("boardAcrossPlays", { count: results.totalPlays })}
            subtitle={t("podiumSubtitle")}
            ownPicks={picks}
          />
        );
      }
    } else {
      const topItems = results.topItems ?? [];
      if (topItems.length > 0) {
        const sacrifice = results.format === "sacrifice_one";
        const isElimination =
          results.format === "save_one" || results.format === "sacrifice_one";
        const heading = isElimination
          ? t(sacrifice ? "topSacrificedHeading" : "topSavedHeading")
          : t("topPickedHeading");
        const subtitle = isElimination
          ? t(sacrifice ? "topSacrificedSubtitle" : "topSavedSubtitle")
          : t("topPickedSubtitle");
        board = (
          <TopPickedTable
            items={topItems}
            title={heading}
            note={t("boardAcrossPlays", { count: results.totalPlays })}
            subtitle={subtitle}
            ownPicks={picks}
          />
        );
      }
    }

    // Mock's `<main data-el="page">`: one column, 20px between the hero and
    // the two-column body, 24px top / 70px bottom padding.
    body = (
      <div className={cn(PACK_CONTAINER, "flex flex-col gap-5 pb-[70px] pt-6")}>
        <ResultHero
          format={results.format}
          shared={shared}
          totalRounds={getRoundsCount(pack)}
          totalPlays={results.totalPlays}
        />
        {shared && <SharedResultNote />}
        {/* Mock's `[data-el="cols"]`: recap (left) + an aside stacking the
            share panel and the pack-wide leaderboard, on a
            `minmax(0,1fr) minmax(0,330px)` grid with an 18px gutter. Below
            the breakpoint it collapses to one column AND drops the aside to
            `display:contents` with the share panel at `order:-1`, so the
            reading order becomes share → recap → leaderboard.

            The breakpoint is 1440, not the mock's 1040. The mock's page is a
            fixed 1240px-wide container, so at 1040 its recap column is still
            ~650px; `PACK_CONTAINER` is 70% of the VIEWPORT, so at a 1040px
            viewport the same split leaves the recap ~330px — narrow enough
            that each round's chips wrap one per line. 1440 is where 70%
            minus the fixed 330px aside reproduces the mock's own proportions. */}
        <div className="grid grid-cols-1 items-start gap-[18px] min-[1440px]:grid-cols-[minmax(0,1fr)_minmax(0,330px)]">
          <div className="min-w-0">{recap}</div>
          {/* `pt-8` starts the aside level with the FIRST ROUND CARD rather
              than with the recap column's own top, which is where the caps
              "ROUND BY ROUND" heading sits — 32px is that heading row (18.8px
              at 12.5px/normal) plus the section's 13px gap. Only at the
              two-column breakpoint; below it the aside is `display:contents`
              and the cards stack, so there is nothing to line up with. */}
          <aside className="flex flex-col gap-[14px] max-[1439px]:contents min-[1440px]:pt-8">
            <ResultAgainPanel
              packId={pack.id}
              status={pack.status}
              picks={picks}
              shared={shared}
              className="max-[1439px]:order-first"
            />
            {board}
          </aside>
        </div>
      </div>
    );
  }

  // Mock (`Results.dc.html`): the same chrome bar as the play screens — back
  // button, cover thumbnail, pack title, "SOLO" chip, meta — not a bare
  // back+action bar. `titleAs="p"`: `ResultHero` renders the page's actual
  // `h1` (the format-aware "Here's what you saved" copy), so the pack title
  // here must not be a second one.
  const roundsCount = getRoundsCount(pack);
  const barMeta = t(shared ? "resultBarMetaShared" : "resultBarMeta", {
    count: roundsCount,
  });

  return (
    <>
      <PackHeaderBar
        pack={pack}
        backHref={`/packs/${pack.id}`}
        backLabel={tPlay("exit")}
        modeLabel={tPlay("soloMode")}
        meta={barMeta}
        titleAs="p"
      />
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
