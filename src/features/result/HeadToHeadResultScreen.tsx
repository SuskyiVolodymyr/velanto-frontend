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
  ItemTally,
  MatchupResult,
  PackResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

/** How many top-picked rows a press of "Load more" adds. */
const TOP_PICKED_PAGE = 10;

/** Outline for each podium place; anything past third gets the plain border. */
const MEDAL_BORDER: Record<number, string> = {
  1: "border-medal-gold",
  2: "border-medal-silver",
  3: "border-medal-bronze",
};

interface Contender {
  title: string;
  /** Share of the plays that saw this pairing and picked this contender. */
  percentage: number;
  won: boolean;
}

interface PlayedMatchup {
  roundIndex: number;
  /** Left and right as they were drawn, NOT winner-first — see playedMatchups. */
  left: Contender;
  right: Contender;
  seen: number;
}

interface RankedTally extends ItemTally {
  /**
   * Competition rank: equal scores share a place and the next one skips
   * accordingly (1, 1, 3). Two items tie only when BOTH their share and their
   * pick count match — the same percentage off a different number of matchups
   * is not the same result.
   */
  rank: number;
}

function rankTallies(items: ItemTally[]): RankedTally[] {
  let previousKey: string | null = null;
  let previousRank = 0;
  return items.map((item, index) => {
    const key = `${item.percentage}|${item.picked}`;
    const rank = key === previousKey ? previousRank : index + 1;
    previousKey = key;
    previousRank = rank;
    return { ...item, rank };
  });
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
 *
 * Contenders keep the SIDES they were drawn on rather than being reordered
 * winner-first: the picks are recorded left-then-right, so the array order is
 * the layout the player actually saw, and rebuilding the row from it is what
 * makes the result recognisable as the matchup they played.
 *
 * Titles come from the PACK, never from the aggregate. The aggregate only
 * knows a pairing once some play has been counted into it, so a result fetched
 * before this play landed has no row to read a title from — which rendered raw
 * item ids on screen.
 */
function playedMatchups(
  ownPicks: RecordedPick[] | null,
  matchups: MatchupResult[],
  titleById: Map<string, string>,
): PlayedMatchup[] {
  if (!ownPicks) return [];
  const byPair = new Map(matchups.map((m) => [`${m.itemAId}|${m.itemBId}`, m]));

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
    const [leftPick, rightPick] = picks;
    if (!leftPick.itemId || !rightPick.itemId) continue;
    if (leftPick.chosen === rightPick.chosen) continue;

    // The aggregate keys a pairing by its two ids sorted, so look it up that
    // way rather than by side — `aWins` is itemA's, not the left card's.
    const [lowId, highId] = [leftPick.itemId, rightPick.itemId].sort();
    const pair = byPair.get(`${lowId}|${highId}`);

    // No row in the aggregate means nothing has been counted for this pairing
    // — a play whose record never landed, or an aggregate fetched before it
    // did. The viewer's own play is still one observation of it, so fall back
    // to that. Treating "unknown" as zero rendered 0% on BOTH sides, which is
    // arithmetically impossible for a matchup someone just finished.
    const seen = pair?.seen ?? 1;
    const leftWins = !pair
      ? Number(leftPick.chosen)
      : pair.itemAId === leftPick.itemId
        ? pair.aWins
        : pair.bWins;
    const leftPercentage = Math.round((leftWins / seen) * 100);

    played.push({
      roundIndex,
      left: {
        title: titleById.get(leftPick.itemId) ?? leftPick.itemId,
        percentage: leftPercentage,
        won: Boolean(leftPick.chosen),
      },
      right: {
        title: titleById.get(rightPick.itemId) ?? rightPick.itemId,
        percentage: 100 - leftPercentage,
        won: Boolean(rightPick.chosen),
      },
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

  const titleById = useMemo(
    () =>
      new Map(
        (pack.groups ?? []).flatMap((group) =>
          group.items.map((item) => [item.id, item.title] as const),
        ),
      ),
    [pack.groups],
  );
  const matchups = useMemo(
    () => playedMatchups(ownPicks, results.matchups ?? [], titleById),
    [ownPicks, results.matchups, titleById],
  );
  const ranked = useMemo(
    () => rankTallies(results.topItems ?? []),
    [results.topItems],
  );
  const visible = ranked.slice(0, shownTopItems);

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
        <div className="mb-10 flex flex-col gap-6">
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

      {ranked.length > 0 && (
        <section className="mb-8">
          <Text as="h2" variant="title" className="mb-1 text-lg">
            {t("topPickedHeading")}
          </Text>
          <Text variant="secondary" className="mb-4 text-sm">
            {t("topPickedSubtitle")}
          </Text>
          <div className="overflow-x-auto">
            <table
              aria-label={t("topPickedHeading")}
              className="w-full border-separate border-spacing-y-2"
            >
              <thead>
                <tr>
                  <th scope="col" className="w-12 px-3 text-start">
                    <Text
                      variant="tertiary"
                      as="span"
                      className="text-xs uppercase tracking-wide"
                    >
                      {t("topPickedRankColumn")}
                    </Text>
                  </th>
                  <th scope="col" className="px-3 text-start">
                    <Text
                      variant="tertiary"
                      as="span"
                      className="text-xs uppercase tracking-wide"
                    >
                      {t("topPickedItemColumn")}
                    </Text>
                  </th>
                  <th scope="col" className="px-3 text-end">
                    <Text
                      variant="tertiary"
                      as="span"
                      className="text-xs uppercase tracking-wide"
                    >
                      {t("topPickedPickedColumn")}
                    </Text>
                  </th>
                  <th scope="col" className="w-20 px-3 text-end">
                    <Text
                      variant="tertiary"
                      as="span"
                      className="text-xs uppercase tracking-wide"
                    >
                      {t("topPickedShareColumn")}
                    </Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  // Keyed on RANK, not row order: tied firsts are both gold and
                  // the next row is third, so it takes bronze and silver goes
                  // unawarded — which is the point of sharing a place.
                  const medal = MEDAL_BORDER[item.rank];
                  return (
                    <tr key={item.itemId} data-rank={item.rank}>
                      <RankCell medal={medal} first>
                        <Text
                          as="span"
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            medal && "text-foreground",
                          )}
                        >
                          {item.rank}
                        </Text>
                      </RankCell>
                      <RankCell medal={medal}>
                        <Text
                          as="span"
                          className="text-sm font-semibold"
                        >
                          {item.itemTitle}
                        </Text>
                      </RankCell>
                      <RankCell medal={medal} align="end">
                        <Text as="span" variant="tertiary" className="text-xs">
                          {t("pickedOfAppeared", {
                            picked: item.picked,
                            appeared: item.appeared,
                          })}
                        </Text>
                      </RankCell>
                      <RankCell medal={medal} align="end" last>
                        <Text
                          as="span"
                          className="text-sm font-semibold tabular-nums text-acc"
                        >
                          {item.percentage}%
                        </Text>
                      </RankCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visible.length < ranked.length && (
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

/**
 * A cell of the top-picked table. The row's outline is drawn per CELL rather
 * than on the `tr`, because a border on a table row doesn't render with
 * `border-collapse: separate` — the rounded ends come from the first and last
 * cell dropping their inner edge.
 */
function RankCell({
  children,
  medal,
  align = "start",
  first = false,
  last = false,
}: {
  children: React.ReactNode;
  medal: string | undefined;
  align?: "start" | "end";
  first?: boolean;
  last?: boolean;
}) {
  return (
    <td
      className={cn(
        "border-y bg-surface px-3 py-3",
        medal ?? "border-border",
        align === "end" ? "text-end" : "text-start",
        first && cn("rounded-s-xl border-s", medal ?? "border-border"),
        last && cn("rounded-e-xl border-e", medal ?? "border-border"),
      )}
    >
      {children}
    </td>
  );
}

/**
 * One played matchup: the two contenders either side of a centre column
 * carrying the round's name, the VS badge, and how many plays saw the pairing.
 *
 * Below `sm` the three stack, each on its own row — two cards plus a divider
 * side by side leaves nothing readable on a phone.
 */
function MatchupRow({
  matchup,
  heading,
}: {
  matchup: PlayedMatchup;
  heading: string;
}) {
  const t = useTranslations("result");
  return (
    <div
      role="group"
      aria-label={t("matchupLabel", {
        heading,
        winner: (matchup.left.won ? matchup.left : matchup.right).title,
        loser: (matchup.left.won ? matchup.right : matchup.left).title,
      })}
      // `items-stretch`, so both cards take the centre column's full height
      // rather than floating as two thin bars beside a three-line stack.
      className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]"
    >
      <ContenderCard contender={matchup.left} side="left" />
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {heading}
        </Text>
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xs font-semibold text-foreground-secondary">
          VS
        </span>
        {/* The sample size sits with the split on purpose: most pairings are
            seen by a handful of players, and a bare 100% reads as a verdict. */}
        <Text variant="tertiary" className="text-xs">
          {t("matchupSeen", { count: matchup.seen })}
        </Text>
      </div>
      <ContenderCard contender={matchup.right} side="right" />
    </div>
  );
}

/**
 * One side of a played matchup, on the side it was DRAWN on — green when the
 * viewer picked it and red when they didn't, so a card stays green even where
 * most players disagreed. Green is therefore not always on the left.
 *
 * The right card's contents are reversed so both percentages land on the inner
 * edge, either side of the VS, and read as one split rather than two unrelated
 * stats.
 */
function ContenderCard({
  contender,
  side,
}: {
  contender: Contender;
  side: "left" | "right";
}) {
  const { won } = contender;
  return (
    <div
      data-testid={won ? "winner" : "loser"}
      data-side={side}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3",
        won
          ? "border-success/60 bg-success/5"
          : "border-danger/60 bg-danger/5",
        side === "left" ? "flex-row" : "flex-row-reverse",
      )}
    >
      <Text
        className={cn(
          "min-w-0 flex-1 text-sm font-semibold",
          side === "left" ? "text-start" : "text-end",
        )}
      >
        {contender.title}
      </Text>
      <Text
        className={cn(
          "flex-none text-sm font-semibold tabular-nums",
          won ? "text-success" : "text-danger",
        )}
      >
        {contender.percentage}%
      </Text>
    </div>
  );
}
