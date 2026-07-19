"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { RankResultScreen } from "@/src/features/result/RankResultScreen";
import { ResultLocked } from "@/src/features/result/ResultLocked";
import { usePackResults } from "@/src/features/result/api/results.queries";
import { useResultPicks } from "@/src/features/result/use-result-picks";
import { SharedResultNote } from "@/src/features/result/SharedResultNote";
import { ResultActions } from "@/src/features/result/ResultActions";
import { roundHeading } from "@/src/shared/lib/round-heading";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import type {
  PackResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

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
  return (
    <GroupResultScreen
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
    <div className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
      <Card className="py-10 text-center hover:translate-y-0 hover:shadow-none">
        <Text variant="danger">{t("loadError")}</Text>
      </Card>
    </div>
  );
}

function GroupResultScreen({
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

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
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

      <div className="mb-8 flex flex-col gap-4">
        {results.rounds.map((round) => {
          const packRound = pack.rounds[round.roundIndex];
          // A single-pool versus round (both sides one pool) reports PER ITEM —
          // a popularity ranking — not a two-side split. The viewer may have
          // chosen several items (a whole side), so highlight them all.
          const singlePool =
            (pack.format === "nxn" || pack.format === "1v1") &&
            packRound?.slots[0]?.groupId === packRound?.slots[1]?.groupId;

          if (singlePool) {
            const chosenIds = new Set(
              ownPicks
                ?.filter(
                  (pick) => pick.roundIndex === round.roundIndex && pick.chosen,
                )
                .map((pick) => pick.itemId),
            );
            return (
              <Card
                key={round.roundIndex}
                className="hover:translate-y-0 hover:shadow-none"
              >
                <Text className="mb-2 font-semibold">
                  {roundHeading(pack, round.roundIndex)}
                </Text>
                <ul className="flex flex-col gap-1">
                  {round.items.map((item) => {
                    const mine = chosenIds.has(item.itemId);
                    return (
                      <li
                        key={item.itemId}
                        className="flex items-center justify-between gap-2"
                      >
                        <Text
                          variant={mine ? undefined : "secondary"}
                          className={cn("text-sm", mine && "font-semibold")}
                        >
                          {item.itemTitle}
                          {mine && (
                            <span className="ml-2 text-xs text-acc">
                              {shared ? t("sharedPick") : t("yourPick")}
                            </span>
                          )}
                        </Text>
                        <Text
                          variant={mine ? undefined : "tertiary"}
                          className={cn(
                            "text-sm",
                            mine && "font-semibold text-acc",
                          )}
                        >
                          {item.percentage}%
                        </Text>
                      </li>
                    );
                  })}
                  {round.items.length === 0 && (
                    <Text variant="tertiary" className="text-sm">
                      {t("noRoundData")}
                    </Text>
                  )}
                </ul>
              </Card>
            );
          }

          const ownPick = ownPicks?.find(
            (pick) => pick.roundIndex === round.roundIndex,
          );
          // Count formats key each round's items by item id; two-pool versus
          // formats key them by the SIDE's group id (that pick carries no
          // itemId), so fall back to the pick's groupId when there's no itemId.
          const ownKey = ownPick
            ? (ownPick.itemId ?? ownPick.groupId)
            : undefined;
          const ownItem =
            ownKey !== undefined
              ? round.items.find((item) => item.itemId === ownKey)
              : undefined;

          return (
            <Card
              key={round.roundIndex}
              className="hover:translate-y-0 hover:shadow-none"
            >
              <Text className="mb-2 font-semibold">
                {roundHeading(pack, round.roundIndex)}
              </Text>
              {ownItem ? (
                <div className="flex items-center justify-between gap-2">
                  <Text variant="secondary" className="text-sm">
                    {shared ? t("sharedPick") : t("yourPick")}:{" "}
                    {ownItem.itemTitle}
                  </Text>
                  <Text className="text-sm font-semibold text-acc">
                    {ownItem.percentage}%
                  </Text>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {round.items.map((item) => (
                    <li
                      key={item.itemId}
                      className="flex items-center justify-between gap-2"
                    >
                      <Text variant="secondary" className="text-sm">
                        {item.itemTitle}
                      </Text>
                      <Text variant="tertiary" className="text-sm">
                        {item.percentage}%
                      </Text>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <ResultActions packId={pack.id} status={pack.status} picks={ownPicks} />
    </div>
  );
}
