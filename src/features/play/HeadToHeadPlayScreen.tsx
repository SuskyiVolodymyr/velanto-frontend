"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { playsClient } from "@/src/shared/lib/plays-client";
import { writeLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { resolveRoundCandidates } from "@/src/features/play/round-sampling";
import { HeadToHeadRound } from "@/src/features/play/HeadToHeadRound";
import type { Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

interface MatchupResult {
  winnerTitle: string;
  loserTitle: string;
}

export function HeadToHeadPlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const router = useRouter();
  const groups = pack.groups ?? [];
  const totalRounds = groups.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [history, setHistory] = useState<MatchupResult[]>([]);
  const [allPicks, setAllPicks] = useState<RecordedPick[]>([]);

  const isFinished = totalRounds > 0 && roundIndex >= totalRounds;
  const group = !isFinished ? groups[roundIndex] : undefined;
  // Re-sampled only when the round changes, not on every render — same
  // rationale as RankPlayScreen's own `candidates` useMemo. The backend
  // guarantees every 1v1 group resolves to exactly 2 items.
  const candidates = useMemo(() => (group ? resolveRoundCandidates(group) : []), [group]);
  const [left, right] = candidates;

  function pick(winnerId: string) {
    if (!group || !left || !right) return;
    const winner = winnerId === left.id ? left : right;
    const loser = winnerId === left.id ? right : left;
    setHistory((prev) => [...prev, { winnerTitle: winner.title, loserTitle: loser.title }]);
    setAllPicks((prev) => [...prev, { groupId: group.id, itemId: winner.id }]);
    setRoundIndex((prev) => prev + 1);
  }

  // Fires once when the last matchup's pick is recorded — mirrors
  // RankPlayScreen's recordedRef guard.
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
        <Text variant="secondary">You need to be logged in to play a pack.</Text>
        <Button className="mt-4" onClick={() => router.push("/auth")}>
          Log in
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
            {isFinished ? "Complete" : `Round ${roundIndex + 1} of ${totalRounds}`}
          </Text>
        </div>
        <div className="h-[3px] w-full rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-acc transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {group && left && right && (
        <>
          <section className="mb-6 text-center">
            <Text as="h1" variant="title" className="mb-2 text-3xl">
              Which one do you prefer?
            </Text>
          </section>
          <div className="mb-10">
            <HeadToHeadRound left={left} right={right} onPick={pick} />
          </div>
        </>
      )}

      {isFinished && (
        <section className="mb-10 text-center">
          <Text as="h1" variant="title" className="mb-2 text-3xl">
            All matchups done
          </Text>
          <Text variant="secondary" className="mb-6">
            Here&apos;s who beat who across {history.length} head-to-head
            {history.length === 1 ? "" : "s"}.
          </Text>
          <div className="mb-8 flex flex-col gap-2 text-left">
            {history.map((entry, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <Text className="font-semibold">{entry.winnerTitle}</Text>
                <Text variant="tertiary" className="text-xs" aria-hidden="true">
                  →
                </Text>
                <Text variant="tertiary" className="text-sm line-through">
                  {entry.loserTitle}
                </Text>
              </div>
            ))}
          </div>
          <Link href={`/packs/${pack.id}/result`} className={buttonClassName("primary", "w-fit")}>
            See your result
          </Link>
        </section>
      )}
    </div>
  );
}
