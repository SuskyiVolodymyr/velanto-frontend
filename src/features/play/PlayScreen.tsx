"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import { cn } from "@/src/shared/lib/cn";
import { playsClient } from "@/src/shared/lib/plays-client";
import { writeLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import type { Pack } from "@/src/shared/types/pack";
import { resolveRoundCandidates, resolveVersusRoundCandidates } from "@/src/features/play/round-sampling";
import { VersusRound } from "@/src/features/play/VersusRound";

const FORMAT_COPY: Record<Pack["format"], { instruction: string; pickedLabel: string; finishedVerb?: string }> = {
  save_one: {
    instruction: "Pick the one you'd save. Check it below, then confirm.",
    pickedLabel: "Saved so far",
    finishedVerb: "saved",
  },
  sacrifice_one: {
    instruction: "Pick the one you'd sacrifice. Check it below, then confirm.",
    pickedLabel: "Sacrificed so far",
    finishedVerb: "sacrificed",
  },
  nxn: {
    instruction: "Pick the side you'd save. Check it below, then confirm.",
    pickedLabel: "Saved so far",
  },
  // Unreachable: rank_blind packs are routed to RankPlayScreen instead (see
  // app/packs/[id]/play/page.tsx) — this entry exists only to satisfy
  // Record<PackFormat, ...>'s exhaustiveness.
  rank_blind: {
    instruction: "",
    pickedLabel: "",
  },
  // Unreachable: 1v1 packs are routed to HeadToHeadPlayScreen instead (see
  // app/packs/[id]/play/page.tsx) — same treatment as rank_blind above.
  "1v1": {
    instruction: "",
    pickedLabel: "",
  },
};

interface Pick {
  groupId: string;
  itemId: string;
  itemTitle: string;
}

export function PlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const router = useRouter();
  const copy = FORMAT_COPY[pack.format];
  const isVersus = pack.format === "nxn";
  const groups = pack.groups ?? [];
  const categories = pack.categories ?? [];
  const versusN = pack.versusN ?? 0;
  const [categoryA, categoryB] = categories;
  const totalRounds = isVersus ? pack.versusRounds ?? 0 : groups.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [revealed, setRevealed] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);

  const isFinished = roundIndex >= totalRounds;
  const group = !isVersus && !isFinished ? groups[roundIndex] : null;

  // Re-sampled only when the round changes, not on every render.
  const candidates = useMemo(() => (group ? resolveRoundCandidates(group) : []), [group]);
  // categoryA/categoryB are the same 2 categories for the whole play session
  // (unlike `group`, which changes reference every round) — roundIndex is
  // the only thing that actually changes when a new round starts, so it
  // must stay in the deps to force a fresh sample each round even though
  // the callback itself never reads it.
  const versusCandidatesA = useMemo(
    () => (isVersus && !isFinished && categoryA ? resolveVersusRoundCandidates(categoryA, versusN) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isVersus, isFinished, categoryA, versusN, roundIndex],
  );
  const versusCandidatesB = useMemo(
    () => (isVersus && !isFinished && categoryB ? resolveVersusRoundCandidates(categoryB, versusN) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isVersus, isFinished, categoryB, versusN, roundIndex],
  );

  // A single per-round model unifies the two formats so the rest of the
  // component reads one shape instead of branching on `isVersus` at every
  // site. `title` and `totalCount` drive the UI; `resolvePick` turns the
  // current `selectedId` into the Pick to record (or null if invalid).
  //
  // totalCount is derived from the actual sampled candidates, not the
  // pack-level versusN directly — a malformed pack with fewer items than
  // versusN in a category would otherwise make "Showing X of Y" over-report
  // and leave "Show next" stuck past the last real card. Backend create-flow
  // validation guarantees this can't happen today, but TS can't express it.
  const round = isVersus
    ? {
        title: `Round ${roundIndex + 1}`,
        totalCount: Math.min(versusCandidatesA.length, versusCandidatesB.length),
        resolvePick(id: string): Pick | null {
          const category = categories.find((c) => c.id === id);
          if (!category) return null;
          return { groupId: String(roundIndex), itemId: category.id, itemTitle: category.name };
        },
      }
    : {
        title: group?.name ?? "",
        totalCount: candidates.length,
        resolvePick(id: string): Pick | null {
          if (!group) return null;
          const item = candidates.find((candidate) => candidate.id === id);
          if (!item) return null;
          return { groupId: group.id, itemId: item.id, itemTitle: item.title };
        },
      };

  const totalCount = round.totalCount;
  const revealedCount = Math.min(revealed, totalCount);
  const canRevealMore = revealedCount < totalCount;
  const canConfirm = selectedId !== null && revealedCount >= totalCount;

  function confirmPick() {
    if (!canConfirm || selectedId === null) return;
    const pick = round.resolvePick(selectedId);
    if (!pick) return;
    setPicks((prev) => [...prev, pick]);
    setRoundIndex((prev) => prev + 1);
    setSelectedId(null);
    setRevealed(1);
  }

  // Fires once when the last round is confirmed: records the play, then
  // stashes the picks for the result page — only once we know the server
  // actually counted them, so "your pick" never shows a percentage that
  // didn't include your own vote (e.g. after a failed request).
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || recordedRef.current || !copy) return;
    recordedRef.current = true;
    const recordedPicks = picks.map(({ groupId, itemId }) => ({ groupId, itemId }));
    playsClient
      .record(pack.id, { picks: recordedPicks })
      .then(() => writeLastPlayPicks(pack.id, recordedPicks))
      .catch(() => undefined);
  }, [isFinished, pack.id, picks, copy]);

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

  const progressPct = isFinished ? 100 : Math.round((roundIndex / totalRounds) * 100);
  const showRound = isVersus ? !isFinished && categoryA && categoryB : Boolean(group);

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

      {showRound && (
        <>
          <section className="mb-6">
            <Text as="h1" variant="title" className="mb-2 text-3xl">
              {round.title}
            </Text>
            <Text variant="secondary">{copy.instruction}</Text>
          </section>

          <div className="mb-4 flex items-center justify-between gap-2">
            <Text variant="tertiary" className="text-sm">
              Showing {revealedCount} of {totalCount}
            </Text>
            {canRevealMore && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setRevealed((prev) => Math.min(prev + 1, totalCount))}
                >
                  Show next
                </Button>
                <Button variant="ghost" onClick={() => setRevealed(totalCount)}>
                  Show all
                </Button>
              </div>
            )}
          </div>

          {isVersus ? (
            <div className="mb-8">
              <VersusRound
                sideA={{ ...categoryA!, items: versusCandidatesA }}
                sideB={{ ...categoryB!, items: versusCandidatesB }}
                revealedCount={revealedCount}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          ) : (
            <div className="mb-8 flex flex-wrap gap-4">
              {candidates.slice(0, revealedCount).map((item, index) => {
                const selected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "w-[200px] flex-none rounded-2xl border p-4 text-left transition-colors",
                      selected
                        ? "border-acc bg-acc/10"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    {item.type === "youtube" && <Badge className="mb-2">YouTube</Badge>}
                    <Text className="font-semibold">{item.title}</Text>
                    <Text variant="tertiary" className="mt-1 text-xs">
                      {String(index + 1).padStart(2, "0")}
                    </Text>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mb-10 flex justify-end">
            <Button disabled={!canConfirm} onClick={confirmPick}>
              Next round →
            </Button>
          </div>
        </>
      )}

      {isFinished && (
        <section className="mb-10">
          <Text as="h1" variant="title" className="mb-2 text-3xl">
            All rounds done
          </Text>
          <Text variant="secondary" className="mb-4">
            {isVersus
              ? `You picked a side in ${picks.length} round${picks.length === 1 ? "" : "s"} between ${categoryA?.name} and ${categoryB?.name}.`
              : `You ${copy.finishedVerb} ${picks.length} pick${picks.length === 1 ? "" : "s"}, one per round.`}
          </Text>
          <Link href={`/packs/${pack.id}/result`} className={buttonClassName("primary", "w-fit")}>
            See your result
          </Link>
        </section>
      )}

      {picks.length > 0 && (
        <section>
          <Text variant="tertiary" className="mb-3 text-xs uppercase tracking-wide">
            {copy.pickedLabel}
          </Text>
          <div className="flex flex-wrap gap-2">
            {picks.map((pick, index) => (
              <Badge key={`${pick.groupId}-${index}`}>{pick.itemTitle}</Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
