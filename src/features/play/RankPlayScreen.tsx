"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { cn } from "@/src/shared/lib/cn";
import { playsClient } from "@/src/shared/lib/plays-client";
import { writeLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { resolveRoundSelections } from "@/src/features/play/round-sampling";
import type { Pack, Item } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

export function RankPlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const t = useTranslations("play");
  const router = useRouter();
  const pathname = usePathname();
  const groups = pack.groups ?? [];
  const rounds = pack.rounds ?? [];
  const totalRounds = rounds.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<number, Item>>({});
  const [allPicks, setAllPicks] = useState<RecordedPick[]>([]);

  // Drawn items for every round, resolved once at mount (dedup spans rounds).
  const selections = useMemo(
    () => resolveRoundSelections(groups, rounds),
    [groups, rounds],
  );
  const groupNameById = useMemo(
    () => new Map(groups.map((g) => [g.id, g.name])),
    [groups],
  );

  const slot =
    roundIndex < totalRounds ? selections[roundIndex]?.slots[0] : undefined;
  const candidates = slot?.items ?? [];
  const groupName = slot ? (groupNameById.get(slot.groupId) ?? "") : "";
  const slotCount = candidates.length;
  const placedCount = Object.keys(placements).length;
  const roundDone = slotCount > 0 && placedCount >= slotCount;
  const isLastRound = roundIndex >= totalRounds - 1;
  const isFinished = totalRounds > 0 && isLastRound && roundDone;
  const isRoundComplete = roundDone && !isFinished;
  const currentItem = !roundDone ? candidates[placedCount] : undefined;

  function place(slotIndex: number) {
    if (!slot || placements[slotIndex] || placedCount >= slotCount) return;
    const item = candidates[placedCount];
    const nextPlacements = { ...placements, [slotIndex]: item };
    setPlacements(nextPlacements);
    if (Object.keys(nextPlacements).length >= slotCount) {
      const roundPicks: RecordedPick[] = Object.entries(nextPlacements).map(
        ([position, placedItem]) => ({
          roundIndex,
          groupId: slot.groupId,
          itemId: placedItem.id,
          position: Number(position),
        }),
      );
      setAllPicks((prev) => [...prev, ...roundPicks]);
    }
  }

  function goToNextRound() {
    setRoundIndex((prev) => prev + 1);
    setPlacements({});
  }

  // Fires once when the last round's last item is placed — mirrors
  // PlayScreen's recordedRef guard.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || recordedRef.current) return;
    recordedRef.current = true;
    playsClient
      .record(pack.id, { picks: allPicks })
      .then(() => writeLastPlayPicks(pack.id, allPicks))
      .catch(() => undefined);
  }, [isFinished, pack.id, allPicks]);

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("loginRequired")}</Text>
        <Button
          className="mt-4"
          onClick={() =>
            router.push(`/auth?next=${encodeURIComponent(pathname)}`)
          }
        >
          {t("logIn")}
        </Button>
      </div>
    );
  }

  const progressPct = isFinished
    ? 100
    : Math.round((roundIndex / Math.max(totalRounds, 1)) * 100);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <Text variant="tertiary" className="text-xs uppercase tracking-wide">
            {isFinished
              ? t("complete")
              : t("roundOf", { current: roundIndex + 1, total: totalRounds })}
          </Text>
        </div>
        <div className="h-[3px] w-full rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-acc transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {slot && !roundDone && (
        <>
          <section className="mb-6 text-center">
            <Text as="h1" variant="title" className="mb-2 text-3xl">
              {groupName}
            </Text>
            <Text variant="secondary">
              {t("rankInstruction", {
                current: placedCount + 1,
                total: slotCount,
              })}
            </Text>
          </section>

          <div className="mb-8 flex justify-center">
            <div className="flex h-[100px] w-[230px] items-center justify-center rounded-2xl border border-acc bg-surface p-4 text-center">
              <Text className="line-clamp-2 font-semibold">
                {currentItem?.title}
              </Text>
            </div>
          </div>

          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: slotCount }, (_, slotIndex) => {
              const filled = placements[slotIndex];
              return (
                <button
                  key={slotIndex}
                  type="button"
                  disabled={Boolean(filled)}
                  onClick={() => place(slotIndex)}
                  aria-label={
                    filled
                      ? t("rankSlotFilled", {
                          rank: slotIndex + 1,
                          title: filled.title,
                        })
                      : t("rankSlotEmpty", { rank: slotIndex + 1 })
                  }
                  className={cn(
                    "flex h-[100px] flex-col justify-between rounded-2xl border p-3 text-left transition-colors",
                    filled
                      ? "border-border bg-surface"
                      : "border-dashed border-border-strong bg-white/[0.02] hover:border-acc/40",
                  )}
                >
                  <Text variant="tertiary" className="text-xs font-semibold">
                    #{slotIndex + 1}
                  </Text>
                  <Text
                    className={cn(
                      "line-clamp-2 text-sm font-semibold",
                      !filled && "text-foreground-tertiary",
                    )}
                  >
                    {filled ? filled.title : t("placeHere")}
                  </Text>
                </button>
              );
            })}
          </div>
        </>
      )}

      {isRoundComplete && slot && (
        <section className="mb-10 text-center">
          <Text as="h1" variant="title" className="mb-2 text-3xl">
            {t("ranked", { name: groupName })}
          </Text>
          <div className="mb-8 flex flex-col gap-2 text-left">
            {Array.from({ length: slotCount }, (_, slotIndex) => (
              <div
                key={slotIndex}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <Text variant="tertiary" className="text-xs font-semibold">
                  #{slotIndex + 1}
                </Text>
                <Text className="font-semibold">
                  {placements[slotIndex]?.title}
                </Text>
              </div>
            ))}
          </div>
          <Button onClick={goToNextRound}>{t("nextRound")}</Button>
        </section>
      )}

      {isFinished && (
        <section className="mb-10 text-center">
          <Text as="h1" variant="title" className="mb-2 text-3xl">
            {t("rankingDone")}
          </Text>
          <Text variant="secondary" className="mb-4">
            {t("rankingDoneSummary", { count: totalRounds })}
          </Text>
          <Link
            href={`/packs/${pack.id}/result`}
            className={buttonClassName("primary", "w-fit")}
          >
            {t("seeResult")}
          </Link>
        </section>
      )}
    </div>
  );
}
