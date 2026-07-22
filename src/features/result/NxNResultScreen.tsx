"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { SharedResultNote } from "@/src/features/result/SharedResultNote";
import { ResultActions } from "@/src/features/result/ResultActions";
import { TopPickedTable } from "@/src/features/result/TopPickedTable";
import { roundHeading } from "@/src/shared/lib/round-heading";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import type {
  PackResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

interface PlayedSide {
  titles: string[];
  picked: boolean;
}

interface PlayedRound {
  roundIndex: number;
  left: PlayedSide;
  right: PlayedSide;
}

/**
 * Rebuild the viewer's own rounds from their picks: the two sides they were
 * shown, the items on each, and which side they took.
 *
 * Sides come from the picks' ORDER (side A's drawn items, then side B's), not
 * from their group ids — a single-pool round draws both sides from one pool, so
 * the ids cannot tell them apart. The boundary is the first change in `chosen`,
 * which holds because a versus pick marks exactly one full side.
 *
 * Rounds whose picks carry no item ids are dropped: those predate item-level
 * recording, which named the winning pool but not what was on it, and nothing
 * can recover the items.
 */
function playedRounds(
  ownPicks: RecordedPick[] | null,
  titleById: Map<string, string>,
): PlayedRound[] {
  if (!ownPicks) return [];

  const byRound = new Map<number, RecordedPick[]>();
  for (const pick of ownPicks) {
    if (pick.itemId === undefined || pick.chosen === undefined) continue;
    byRound.set(pick.roundIndex, [
      ...(byRound.get(pick.roundIndex) ?? []),
      pick,
    ]);
  }

  const played: PlayedRound[] = [];
  for (const [roundIndex, picks] of [...byRound.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    const boundary = picks.findIndex((pick) => pick.chosen !== picks[0].chosen);
    // Every item on one side means only one side was recorded — not a matchup.
    if (boundary <= 0) continue;

    const toSide = (slice: RecordedPick[]): PlayedSide => ({
      titles: slice.map((pick) => titleById.get(pick.itemId!) ?? pick.itemId!),
      picked: Boolean(slice[0]?.chosen),
    });
    played.push({
      roundIndex,
      left: toSide(picks.slice(0, boundary)),
      right: toSide(picks.slice(boundary)),
    });
  }
  return played;
}

/**
 * The nxn result: the rounds you played, each as the two sides you were shown
 * with the one you took marked.
 *
 * Deliberately carries NO percentages. An nxn matchup is a set of up to 8 items
 * against another set, so the number of possible pairings is C(N,8)² per round —
 * far beyond any play count, which would leave every share reading 100%/0% off
 * a single play forever (velanto-frontend#333). A recap of your own run is the
 * honest thing to show.
 */
export function NxNResultScreen({
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

  const titleById = useMemo(
    () =>
      new Map(
        (pack.groups ?? []).flatMap((group) =>
          group.items.map((item) => [item.id, item.title] as const),
        ),
      ),
    [pack.groups],
  );
  const rounds = useMemo(
    () => playedRounds(ownPicks, titleById),
    [ownPicks, titleById],
  );
  const topItems = results.topItems ?? [];

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

      <ResultActions
        packId={pack.id}
        status={pack.status}
        picks={ownPicks}
        shared={shared}
        className="mb-6 justify-end"
      />

      {rounds.length > 0 ? (
        <div className="mb-10 flex flex-col divide-y divide-border">
          {rounds.map((round) => (
            <div key={round.roundIndex} className="py-4 first:pt-0 last:pb-0">
              <RoundRow
                round={round}
                heading={roundHeading(pack, round.roundIndex)}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card className="mb-10 py-8 text-center hover:translate-y-0 hover:shadow-none">
          <Text variant="tertiary" className="text-sm">
            {t("noMatchupBreakdown")}
          </Text>
        </Card>
      )}

      {/* The one aggregate nxn CAN state honestly: per ITEM, not per pairing.
          An item's win rate is a share of the rounds it appeared in, which
          saturates immediately — unlike a set-vs-set pairing, which almost
          never repeats. */}
      {topItems.length > 0 && (
        <section className="mb-8">
          <Text as="h2" variant="title" className="mb-1 text-lg">
            {t("topPickedHeading")}
          </Text>
          <Text variant="secondary" className="mb-4 text-sm">
            {t("topPickedSubtitle")}
          </Text>
          <TopPickedTable items={topItems} />
        </section>
      )}
    </div>
  );
}

/**
 * One played round: the two sides either side of a centre column carrying the
 * round's name. Below `sm` the three stack, each on its own row.
 */
function RoundRow({ round, heading }: { round: PlayedRound; heading: string }) {
  const t = useTranslations("result");
  return (
    <div
      role="group"
      aria-label={t("nxnRoundLabel", {
        heading,
        picked: (round.left.picked ? round.left : round.right).titles.join(
          ", ",
        ),
      })}
      // The centre column is a FIXED width, not `auto`: sized to its content it
      // grew with the round's name, so a long name shrank both cards and every
      // row ended up a different width.
      className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)]"
    >
      <SideCard side={round.left} position="left" />
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {heading}
        </Text>
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xs font-semibold text-foreground-secondary">
          VS
        </span>
      </div>
      <SideCard side={round.right} position="right" />
    </div>
  );
}

/**
 * One side of a played round — outline and a faint tint, green for the side the
 * viewer took and red for the one they dropped.
 *
 * Each ITEM gets its own container inside. A side can hold up to eight of them,
 * which ran together as one block of text; the inner containers are a step up
 * from the card behind them rather than a contrasting panel, so the side still
 * reads as one thing.
 */
function SideCard({
  side,
  position,
}: {
  side: PlayedSide;
  position: "left" | "right";
}) {
  return (
    <div
      data-testid={side.picked ? "picked" : "dropped"}
      data-side={position}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl border p-3",
        side.picked
          ? "border-success/60 bg-success/5"
          : "border-danger/60 bg-danger/5",
      )}
    >
      <ul className="flex flex-col gap-2">
        {side.titles.map((title, index) => (
          <li
            key={`${title}-${index}`}
            className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
          >
            <Text
              className={cn(
                "truncate text-sm font-semibold",
                position === "right" && "text-end",
              )}
            >
              {title}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}
