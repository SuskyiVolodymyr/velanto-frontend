"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import type { RevealRoundResult, RoomState } from "./room-types";

interface GuessWhoRevealBoardProps {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}

/**
 * Guess-who's between-round beat (design brief §4.3(d)/§3.5): a chronology
 * table — rows are rounds, columns are the stable anonymous labels — so the
 * whole game's trajectory is reviewable at a glance. Every cell resolves the
 * label's raw item id back to its title via that round's own `items`, since
 * `picks` only ever carries ids.
 */
export function GuessWhoRevealBoard({
  state,
  currentUserId,
  onNext,
}: GuessWhoRevealBoardProps) {
  const t = useTranslations("room");
  const reveals = state.results.filter(
    (r): r is RevealRoundResult => r.kind === "reveal",
  );
  const labels = Array.from(
    new Set(reveals.flatMap((r) => Object.keys(r.picks))),
  ).sort();

  const me = state.players.find((p) => p.userId === currentUserId) ?? null;
  const ready = state.players.filter((p) => p.next).length;
  const total = state.players.length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("guessWho.revealHeading")}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {t("guessWho.trajectoryHeading")}
        </Text>
      </header>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="p-3 text-start font-semibold text-foreground-secondary">
                {t("guessWho.roundColumn")}
              </th>
              {labels.map((label) => (
                <th
                  key={label}
                  className="p-3 text-start font-semibold text-foreground-secondary"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reveals.map((round) => {
              const itemsById = new Map(
                round.items.map((item) => [item.id, item]),
              );
              return (
                <tr
                  key={round.index}
                  className="border-b border-border last:border-0"
                >
                  <td className="p-3 font-medium text-foreground-tertiary">
                    {round.name ||
                      t("results.roundLabel", { index: round.index + 1 })}
                  </td>
                  {labels.map((label) => {
                    const ids = round.picks[label] ?? [];
                    const titles = ids
                      .map((id) => itemsById.get(id)?.title ?? id)
                      .join(", ");
                    return (
                      <td key={label} className="p-3">
                        {titles || "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="secondary" aria-live="polite" className="text-sm">
          {t("between.ready", { count: ready, total })}
        </Text>
        <Button disabled={me?.next ?? false} onClick={onNext}>
          {t("between.next")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
