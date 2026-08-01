"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { bordaAlignment } from "./borda-alignment";
import type { BordaRoundResult, RoomState } from "./room-types";

/**
 * Shared-grid's resolved round (Rank Modes.dc.html, grid arm): the ranking the
 * room produced, and how close each player's own ballot was to it.
 *
 * Nobody wins here — the result belongs to everybody — so the aside is
 * ALIGNMENT rather than a score table. It is computed client-side from the
 * ballots already on the wire (see borda-alignment), which is why it needed no
 * backend change to exist.
 */
export function BordaRevealBoard({
  state,
  currentUserId,
  onNext,
}: {
  state: RoomState;
  currentUserId: string | null;
  onNext: () => void;
}) {
  const t = useTranslations("room");
  const round = state.round;
  const result = state.results.find(
    (r): r is BordaRoundResult =>
      r.kind === "borda" && r.index === round?.index,
  );
  if (!round || !result) return null;

  const itemsById = new Map(result.items.map((item) => [item.id, item]));
  const playerById = new Map(state.players.map((p) => [p.userId, p]));
  const me = state.players.find((p) => p.userId === currentUserId);
  const ready = state.players.filter((p) => p.next).length;

  const alignment = Object.entries(bordaAlignment(result)).sort(
    (a, b) => b[1] - a[1],
  );

  // Each tier's rank number is 1 plus the total size of every tier before
  // it — precomputed in a plain loop here, rather than mutating a running
  // counter inside the JSX .map() below (which the lint rule flags as an
  // unsafe cross-render reassignment).
  const tierStartRanks: number[] = [];
  let cumulativeRank = 1;
  for (const tier of result.order) {
    tierStartRanks.push(cumulativeRank);
    cumulativeRank += tier.length;
  }

  // Who ranked an item first — the avatars that ride its row.
  const firstChoiceBy = new Map<string, string[]>();
  for (const [userId, ballot] of Object.entries(result.ballots)) {
    const top = ballot[0];
    if (!top) continue;
    firstChoiceBy.set(top, [...(firstChoiceBy.get(top) ?? []), userId]);
  }

  return (
    <div className="grid items-start gap-[18px] min-[1080px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <section
        aria-label={t("sharedGrid.groupRanking")}
        className="flex flex-col gap-[9px] rounded-card border border-border bg-surface-card p-[18px] max-[1079px]:order-2"
      >
        <div className="flex items-baseline gap-[9px] pb-1">
          <Text as="h2" className="text-[13px] font-bold">
            {t("sharedGrid.groupRanking")}
          </Text>
          <Text variant="tertiary" className="ms-auto text-[11.5px]">
            {t("sharedGrid.aggregateHint")}
          </Text>
        </div>

        <ol className="flex flex-col gap-2">
          {result.order.map((tier, tierIndex) => {
            const rowRank = tierStartRanks[tierIndex];
            const tied = tier.length > 1;
            const voters = tier.flatMap((id) => firstChoiceBy.get(id) ?? []);
            return (
              <li
                key={tierIndex}
                className={cn(
                  "flex flex-col gap-1 rounded-tile border p-[11px_13px]",
                  tierIndex === 0
                    ? "border-score/40 bg-score/10"
                    : "border-border bg-background",
                )}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] font-mono text-[13px] font-bold tabular-nums",
                      tierIndex === 0
                        ? "bg-score/20 text-score"
                        : "bg-white/[0.06] text-foreground-secondary",
                    )}
                  >
                    {rowRank}
                  </span>
                  {tier.map((itemId) => (
                    <Text key={itemId} className="text-sm font-semibold">
                      {itemsById.get(itemId)?.title ?? itemId}
                    </Text>
                  ))}
                  <span className="ms-auto flex items-center gap-2.5">
                    <span className="flex">
                      {voters.map((userId) => {
                        const player = playerById.get(userId);
                        return player ? (
                          <UserAvatar
                            key={userId}
                            username={player.username}
                            avatarKey={player.avatarKey}
                            className="-ms-1.5 h-[22px] w-[22px] rounded-full border-2 border-surface-card bg-surface-raised text-[8.5px] font-bold text-foreground"
                          />
                        ) : null;
                      })}
                    </span>
                    <span className="min-w-[26px] text-end font-mono text-[12.5px] font-bold tabular-nums text-foreground-secondary">
                      {result.scores[tier[0]] ?? 0}
                    </span>
                  </span>
                </div>
                {tied && (
                  <Text variant="tertiary" className="text-xs">
                    {t("sharedGrid.tiedNote", { count: tier.length })}
                  </Text>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Text variant="secondary" aria-live="polite" className="text-sm">
            {t("between.ready", { count: ready, total: state.players.length })}
          </Text>
          <Button disabled={Boolean(me?.next)} onClick={onNext}>
            {t("between.next")}
            <ArrowRight size={16} aria-hidden />
          </Button>
        </div>
      </section>

      <aside className="max-[1079px]:order-1">
        <section
          aria-label={t("sharedGrid.alignment")}
          className="flex flex-col gap-3 rounded-card border border-border bg-surface-card p-[18px]"
        >
          <div className="flex items-baseline gap-[9px]">
            <Text as="h2" className="text-[15px] font-bold">
              {t("sharedGrid.alignment")}
            </Text>
            <Text variant="tertiary" className="ms-auto text-[11.5px]">
              {t("sharedGrid.alignmentHint")}
            </Text>
          </div>

          <ul className="flex flex-col gap-2.5">
            {alignment.map(([userId, value]) => {
              const player = playerById.get(userId);
              const pct = Math.round(value * 100);
              return (
                <li key={userId} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-[9px]">
                    <UserAvatar
                      username={player?.username ?? userId}
                      avatarKey={player?.avatarKey ?? null}
                      className="h-6 w-6 flex-none rounded-full bg-surface-raised text-[9.5px] font-bold text-foreground"
                    />
                    <Text className="min-w-0 truncate text-[12.5px] font-semibold">
                      {player?.username ?? userId}
                    </Text>
                    <span className="ms-auto font-mono text-[12.5px] font-bold tabular-nums text-foreground-secondary">
                      {pct}%
                    </span>
                  </div>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-acc"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>

          <Text
            variant="tertiary"
            className="text-[11.5px] leading-[1.45] text-pretty"
          >
            {t("sharedGrid.alignmentNote")}
          </Text>
        </section>
      </aside>
    </div>
  );
}
