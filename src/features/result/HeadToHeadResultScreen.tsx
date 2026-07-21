"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { SharedResultNote } from "@/src/features/result/SharedResultNote";
import { ResultActions } from "@/src/features/result/ResultActions";
import { roundHeading } from "@/src/shared/lib/round-heading";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import type {
  MatchupResult,
  PackResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

/** How many top-picked entries a press of "Load more" adds. */
const TOP_PICKED_PAGE = 10;

interface PlayedMatchup {
  roundIndex: number;
  winnerId: string;
  winnerTitle: string;
  loserId: string;
  loserTitle: string;
  /** Share of the plays that saw this pairing and picked the winner. */
  winnerPercentage: number;
  loserPercentage: number;
  seen: number;
}

/**
 * Rebuild the viewer's own matchups from their picks, then attach the crowd's
 * split for each exact pairing.
 *
 * Driven by the PICKS, not by the results' rounds: which two items met is a
 * property of this play (a random draw), so the aggregate can't say what the
 * viewer saw. Rounds whose picks carry no item ids are dropped — those are
 * plays recorded before matchups named their contenders, and nothing can
 * recover the pairing (velanto-frontend#333).
 */
function playedMatchups(
  ownPicks: RecordedPick[] | null,
  matchups: MatchupResult[],
): PlayedMatchup[] {
  if (!ownPicks) return [];
  const byPair = new Map(
    matchups.map((m) => [`${m.itemAId}|${m.itemBId}`, m]),
  );

  const byRound = new Map<number, RecordedPick[]>();
  for (const pick of ownPicks) {
    if (pick.itemId === undefined || pick.chosen === undefined) continue;
    byRound.set(pick.roundIndex, [
      ...(byRound.get(pick.roundIndex) ?? []),
      pick,
    ]);
  }

  const played: PlayedMatchup[] = [];
  for (const [roundIndex, picks] of [...byRound.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    if (picks.length !== 2) continue;
    const winner = picks.find((pick) => pick.chosen);
    const loser = picks.find((pick) => !pick.chosen);
    if (!winner?.itemId || !loser?.itemId) continue;

    // The aggregate keys a pairing by its two ids sorted, so look it up that
    // way rather than by who won — `aWins` is itemA's, not the winner's.
    const [lowId, highId] = [winner.itemId, loser.itemId].sort();
    const pair = byPair.get(`${lowId}|${highId}`);
    const seen = pair?.seen ?? 0;
    const winnerWins = !pair
      ? 0
      : pair.itemAId === winner.itemId
        ? pair.aWins
        : pair.bWins;

    played.push({
      roundIndex,
      winnerId: winner.itemId,
      winnerTitle:
        pair?.itemAId === winner.itemId
          ? pair.itemATitle
          : (pair?.itemBTitle ?? winner.itemId),
      loserId: loser.itemId,
      loserTitle:
        pair?.itemAId === loser.itemId
          ? pair.itemATitle
          : (pair?.itemBTitle ?? loser.itemId),
      winnerPercentage: seen === 0 ? 0 : Math.round((winnerWins / seen) * 100),
      loserPercentage:
        seen === 0 ? 0 : 100 - Math.round((winnerWins / seen) * 100),
      seen,
    });
  }
  return played;
}

/**
 * The 1v1 result: the matchups you played, then the pack's most-picked items.
 *
 * Split out of GroupResultScreen because 1v1's result is a different object
 * entirely — a list of head-to-heads you can compare yourself against, not a
 * per-round tally of a shared candidate list.
 */
export function HeadToHeadResultScreen({
  pack,
  results,
  ownPicks,
  shared,
}: {
  pack: Pack;
  results: PackResults;
  ownPicks: RecordedPick[] | null;
  shared: boolean;
}) {
  const t = useTranslations("result");
  const [shownTopItems, setShownTopItems] = useState(TOP_PICKED_PAGE);

  const matchups = useMemo(
    () => playedMatchups(ownPicks, results.matchups ?? []),
    [ownPicks, results.matchups],
  );
  const topItems = results.topItems ?? [];
  const visibleTopItems = topItems.slice(0, shownTopItems);

  return (
    <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>
      <Text variant="tertiary" className="mb-2 text-xs uppercase tracking-wide">
        {t("label")}
      </Text>
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        {pack.title}
      </Text>
      <Text variant="secondary" className="mb-8">
        {t("playsRecorded", { count: results.totalPlays })}
      </Text>

      {shared && <SharedResultNote />}

      {matchups.length > 0 ? (
        <div className="mb-10 flex flex-col gap-3">
          {matchups.map((matchup) => (
            <MatchupRow
              key={matchup.roundIndex}
              matchup={matchup}
              heading={roundHeading(pack, matchup.roundIndex)}
            />
          ))}
        </div>
      ) : (
        <Card className="mb-10 py-8 text-center hover:translate-y-0 hover:shadow-none">
          <Text variant="tertiary" className="text-sm">
            {t("noMatchupBreakdown")}
          </Text>
        </Card>
      )}

      {topItems.length > 0 && (
        <section className="mb-8">
          <Text as="h2" variant="title" className="mb-1 text-lg">
            {t("topPickedHeading")}
          </Text>
          <Text variant="secondary" className="mb-4 text-sm">
            {t("topPickedSubtitle")}
          </Text>
          <ol
            aria-label={t("topPickedHeading")}
            className="flex flex-col gap-2"
          >
            {visibleTopItems.map((item, index) => (
              <li
                key={item.itemId}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <Text
                  variant="tertiary"
                  className="w-6 flex-none text-xs font-semibold tabular-nums"
                >
                  {index + 1}
                </Text>
                <Text className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {item.itemTitle}
                </Text>
                <Text variant="tertiary" className="flex-none text-xs">
                  {t("pickedOfAppeared", {
                    picked: item.picked,
                    appeared: item.appeared,
                  })}
                </Text>
                <Text className="w-12 flex-none text-end text-sm font-semibold tabular-nums text-acc">
                  {item.percentage}%
                </Text>
              </li>
            ))}
          </ol>
          {visibleTopItems.length < topItems.length && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                onClick={() =>
                  setShownTopItems((shown) => shown + TOP_PICKED_PAGE)
                }
              >
                {t("loadMore")}
              </Button>
            </div>
          )}
        </section>
      )}

      <ResultActions packId={pack.id} status={pack.status} picks={ownPicks} />
    </div>
  );
}

function MatchupRow({
  matchup,
  heading,
}: {
  matchup: PlayedMatchup;
  heading: string;
}) {
  const t = useTranslations("result");
  return (
    <Card
      role="group"
      aria-label={t("matchupLabel", {
        heading,
        winner: matchup.winnerTitle,
        loser: matchup.loserTitle,
      })}
      className="hover:translate-y-0 hover:shadow-none"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {heading}
        </Text>
        {/* The sample size sits with the split on purpose: most pairings are
            seen by a handful of players, and a bare 100% reads as a verdict. */}
        <Text variant="tertiary" className="text-xs">
          {t("matchupSeen", { count: matchup.seen })}
        </Text>
      </div>
      <div className="flex items-stretch gap-3">
        <ContenderCard
          title={matchup.winnerTitle}
          percentage={matchup.winnerPercentage}
          outcome="winner"
        />
        <span className="flex w-11 flex-none items-center justify-center self-center rounded-full border border-border bg-white/[0.04] text-xs font-semibold text-foreground-secondary">
          VS
        </span>
        <ContenderCard
          title={matchup.loserTitle}
          percentage={matchup.loserPercentage}
          outcome="loser"
        />
      </div>
    </Card>
  );
}

/**
 * One side of a played matchup. Green is the contender the VIEWER picked and
 * red the one they dropped — the outcome is theirs, not the crowd's, so a card
 * stays green even when most players disagreed with it.
 *
 * The percentage sits on the inner edge, next to the VS, so the two numbers
 * read as one split rather than two unrelated stats.
 */
function ContenderCard({
  title,
  percentage,
  outcome,
}: {
  title: string;
  percentage: number;
  outcome: "winner" | "loser";
}) {
  const winner = outcome === "winner";
  return (
    <div
      data-testid={outcome}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-3",
        winner
          ? "border-success/40 bg-success/10"
          : "border-danger/40 bg-danger/10",
        // Loser's percentage hugs the VS too, so both numbers meet in the
        // middle instead of bracketing the row.
        winner ? "flex-row" : "flex-row-reverse",
      )}
    >
      <Text className="min-w-0 flex-1 truncate text-sm font-semibold">
        {title}
      </Text>
      <Text
        className={cn(
          "flex-none text-sm font-semibold tabular-nums",
          winner ? "text-success" : "text-danger",
        )}
      >
        {percentage}%
      </Text>
    </div>
  );
}
