import type {
  PackResults,
  RankResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

/**
 * The result page's hero stat tiles (D5, `docs/superpowers/plans/2026-07-28-solo-play-results-redesign.md`).
 *
 * `labelKey` only — never label TEXT. T11 picks the actual i18n key per tile
 * (own result vs a shared link's result read differently, "your agreement"
 * vs "the sharer's agreement"), so this module must not bake in which one.
 */
export type ResultTile =
  | { kind: "percent"; labelKey: string; value: number }
  | { kind: "pick"; labelKey: string; title: string; percent: number }
  | { kind: "count"; labelKey: string; value: number };

export interface SummarizeResultInput {
  ownPicks: RecordedPick[] | null;
  results: PackResults | RankResults;
}

/**
 * Resolves D5: the mock's hero tiles are built from `count / totalPlays`,
 * which #336 deleted as misleading (caps a rarely-drawn item at how often the
 * draw surfaces it, lists never-drawn items at 0%) and #333 rules out
 * entirely for nxn (a set-vs-set pairing essentially never repeats). Every
 * percentage tile below comes from `ItemTally.percentage` (`picked / appeared`)
 * — the honest denominator already shipped on `topItems` — and nxn/rank_blind
 * get counts instead of percentages, never a synthesized share.
 *
 * "Zeros are a lie here, not a fallback" (plan, D5): when the numbers behind a
 * tile don't exist we return `tiles: []` so the caller hides the whole row,
 * rather than rendering a 0% that looks like a real, honest zero.
 */
export function summarizeResult({
  ownPicks,
  results,
}: SummarizeResultInput): { tiles: ResultTile[] } {
  if (!ownPicks || ownPicks.length === 0) return { tiles: [] };

  // Switch on `results.format`, not a separately-passed pack format: this IS
  // the discriminant the PackResults | RankResults union is typed for, so TS
  // narrows `results` for free and an unsound `as` cast can't drift from the
  // value that actually decides the runtime shape.
  switch (results.format) {
    case "save_one":
    case "sacrifice_one":
    case "1v1":
      return { tiles: summarizePickShare(ownPicks, results) };
    case "nxn":
      return { tiles: summarizeNxn(ownPicks, results) };
    case "rank_blind":
      return { tiles: summarizeRank(ownPicks, results) };
  }
}

/**
 * save_one / sacrifice_one / 1v1: join the picks this player actually chose
 * against the pack-wide `topItems` tally by item id, then report the mean
 * share, the most-agreed-with pick and the least-agreed-with pick — all in
 * `picked / appeared` terms, never `count / totalPlays`.
 */
function summarizePickShare(
  ownPicks: RecordedPick[],
  results: PackResults,
): ResultTile[] {
  const topItems = results.topItems ?? [];
  if (topItems.length === 0) return [];

  const tallyById = new Map(topItems.map((tally) => [tally.itemId, tally]));

  // `chosen !== false` (not `chosen === true`): a pick with no `chosen` field
  // at all is a play recorded before velanto-frontend#336, which stored only
  // the winner — that entry IS the pick, same as EliminationResultScreen's
  // own `playedRounds` treats it.
  const joined = ownPicks
    .filter((pick) => pick.itemId !== undefined && pick.chosen !== false)
    .map((pick) => tallyById.get(pick.itemId!))
    .filter((tally): tally is NonNullable<typeof tally> => tally !== undefined);

  if (joined.length === 0) return [];

  const agreement = Math.round(
    joined.reduce((sum, tally) => sum + tally.percentage, 0) / joined.length,
  );

  const mostAgreed = joined.reduce((best, tally) =>
    tally.percentage > best.percentage ? tally : best,
  );
  const leastAgreed = joined.reduce((worst, tally) =>
    tally.percentage < worst.percentage ? tally : worst,
  );

  const tiles: ResultTile[] = [
    { kind: "percent", labelKey: "result.statAgreement", value: agreement },
    {
      kind: "pick",
      labelKey: "result.statTopPick",
      title: mostAgreed.itemTitle,
      percent: mostAgreed.percentage,
    },
  ];

  // Single joined pick: mostAgreed and leastAgreed are the SAME item. Showing
  // both would name one item under two different labels, which reads as two
  // facts when it's one. Keep only the "top pick" tile — of the two labels
  // it is the one that still makes sense standing alone with a single data
  // point (a "rarest pick" implies a set to be rare among).
  if (joined.length > 1) {
    tiles.push({
      kind: "pick",
      labelKey: "result.statRarePick",
      title: leastAgreed.itemTitle,
      percent: leastAgreed.percentage,
    });
  }

  return tiles;
}

/**
 * nxn: never a percentage (#333 — a set-vs-set pairing essentially never
 * repeats, so any share would read 100%/0% off a single play forever).
 * `results.totalPlays` is the pack-wide count already shown elsewhere on this
 * screen; the other two counts come from this player's own recorded picks.
 *
 * `RecordedPick.groupId` carries the chosen SIDE's pool id with no `itemId`
 * for a two-pool round (you pick a side, not an item), and only a
 * single-pool round records one pick per drawn item. `ownPicks.length` is
 * therefore an honest count of "things you saw and recorded a decision
 * about" either way, even though it under-counts a two-pool round's actual
 * candidate list (which this module has no visibility into — that list lives
 * on the pack, not on the pick or the results).
 */
function summarizeNxn(
  ownPicks: RecordedPick[],
  results: PackResults,
): ResultTile[] {
  const roundsPlayed = new Set(ownPicks.map((pick) => pick.roundIndex)).size;

  return [
    { kind: "count", labelKey: "result.statPlays", value: results.totalPlays },
    { kind: "count", labelKey: "result.statRoundsPlayed", value: roundsPlayed },
    { kind: "count", labelKey: "result.statItemsSeen", value: ownPicks.length },
  ];
}

/**
 * rank_blind: no per-pick share exists (`RankResults` has no agreement
 * number), so all three tiles are counts derived from this player's own
 * placements plus the pack-wide podium.
 */
function summarizeRank(
  ownPicks: RecordedPick[],
  results: RankResults,
): ResultTile[] {
  const placed = ownPicks.filter((pick) => pick.position !== undefined);
  if (placed.length === 0) return [];

  const roundsRanked = new Set(placed.map((pick) => pick.roundIndex)).size;
  const podiumEntries = (results.podium ?? []).length;

  return [
    { kind: "count", labelKey: "result.statRoundsRanked", value: roundsRanked },
    { kind: "count", labelKey: "result.statItemsPlaced", value: placed.length },
    {
      kind: "count",
      labelKey: "result.statPodiumEntries",
      value: podiumEntries,
    },
  ];
}
