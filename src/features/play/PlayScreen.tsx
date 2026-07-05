"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import { resolveRoundCandidates } from "@/src/features/play/round-sampling";

const FORMAT_COPY: Record<
  Pack["format"],
  { instruction: string; pickedLabel: string; finishedVerb: string }
> = {
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
};

interface Pick {
  roundName: string;
  itemTitle: string;
}

export function PlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const router = useRouter();
  const copy = FORMAT_COPY[pack.format];
  const totalRounds = pack.groups.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [revealed, setRevealed] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);

  const isFinished = roundIndex >= totalRounds;
  const group = isFinished ? null : pack.groups[roundIndex];

  // Re-sampled only when the round changes, not on every render.
  const candidates = useMemo(() => (group ? resolveRoundCandidates(group) : []), [group]);

  const totalCount = candidates.length;
  const revealedCount = Math.min(revealed, totalCount);
  const canRevealMore = revealedCount < totalCount;
  const canConfirm = selectedId !== null && revealedCount >= totalCount;

  function confirmPick() {
    if (!canConfirm || !group) return;
    const item = candidates.find((candidate) => candidate.id === selectedId);
    if (!item) return;
    setPicks((prev) => [...prev, { roundName: group.name, itemTitle: item.title }]);
    setRoundIndex((prev) => prev + 1);
    setSelectedId(null);
    setRevealed(1);
  }

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

      {group && (
        <>
          <section className="mb-6">
            <Text as="h1" variant="title" className="mb-2 text-3xl">
              {group.name}
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
          <Text variant="secondary">
            You {copy.finishedVerb} {picks.length} pick{picks.length === 1 ? "" : "s"}, one per
            round.
          </Text>
        </section>
      )}

      {picks.length > 0 && (
        <section>
          <Text variant="tertiary" className="mb-3 text-xs uppercase tracking-wide">
            {copy.pickedLabel}
          </Text>
          <div className="flex flex-wrap gap-2">
            {picks.map((pick, index) => (
              <Badge key={`${pick.roundName}-${index}`}>{pick.itemTitle}</Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
