"use client";

import { useTranslations } from "next-intl";
import { EyeOff } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import type { RoomState, SpyRoundResult } from "./room-types";

/**
 * "Every pick, every round": one row per round, one column per player, every
 * choice in the open.
 *
 * The same evidence board Guess-who's own table is, with the masking inverted —
 * these columns are real people, because Spy hides the BOARD and not the names.
 * Deliberately a sibling rather than an extraction of `GuessWhoLabelTable`: that
 * one carries label tones, a mapping reveal and a rank_blind ordering cell, none
 * of which exist here, and the shared part is a plain grid. If a third mode
 * wants one, extract then, with three call sites to shape it.
 *
 * It renders during the accusation phase too, not just afterwards, because it
 * is what the accusation is READ FROM: one round attributes nothing, and it is
 * a player's run of choices that gives them away.
 */
export function SpyPickTable({
  state,
  /** Once revealed, mark the spy's column and their blind picks. */
  reveal,
}: {
  state: RoomState;
  reveal?: { spyUserId: string; hiddenByRound: string[][] };
}) {
  const t = useTranslations("room");
  const rounds = state.results.filter(
    (result): result is SpyRoundResult => result.kind === "spy_round",
  );
  if (rounds.length === 0) return null;

  const players = [...state.players].sort((a, b) => a.seat - b.seat);
  const titleById = new Map<string, string>();
  for (const round of rounds) {
    for (const item of round.items) titleById.set(item.id, item.title);
    for (const side of round.sides ?? []) titleById.set(side.id, side.name);
  }

  return (
    <section
      aria-label={t("spy.reveal.historyHeading")}
      className="flex flex-col gap-[13px] rounded-card border border-border bg-surface-card p-5"
    >
      <div className="flex flex-wrap items-baseline gap-2.5">
        <Text as="h2" className="text-base font-bold tracking-[-0.01em]">
          {t("spy.reveal.historyHeading")}
        </Text>
        <Text variant="tertiary" className="text-[12.5px]">
          {t("spy.reveal.historyHint")}
        </Text>
      </div>

      {/* Scrolls itself rather than letting a wide roster push the page
          sideways — eight columns is a legal room. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-1 text-start">
          <thead>
            <tr>
              <th scope="col" className="w-12">
                <span className="sr-only">{t("spy.reveal.historyHeading")}</span>
              </th>
              {players.map((player) => {
                const isSpy = reveal?.spyUserId === player.userId;
                return (
                  <th
                    key={player.userId}
                    scope="col"
                    className={cn(
                      "rounded-[10px] border p-1.5 align-bottom",
                      isSpy
                        ? "border-spy/40 bg-spy/[0.12]"
                        : "border-border bg-white/[0.03]",
                    )}
                  >
                    <span className="flex flex-col items-center gap-1">
                      <UserAvatar
                        username={player.username}
                        avatarKey={player.avatarKey}
                        tone
                        className="h-7 w-7 flex-none rounded-full text-[10px]"
                      />
                      <span
                        className={cn(
                          "max-w-[84px] truncate text-[11px] font-semibold",
                          isSpy ? "text-spy" : "text-foreground-secondary",
                        )}
                      >
                        {player.username}
                      </span>
                      {isSpy && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-spy/20 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.05em] text-spy">
                          <EyeOff size={9} aria-hidden />
                          {t("spy.badge")}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => {
              const hidden = new Set(reveal?.hiddenByRound[round.index] ?? []);
              return (
                <tr key={round.index}>
                  <th
                    scope="row"
                    className="pe-1 text-end font-mono text-[11px] font-bold text-foreground-tertiary tabular-nums"
                  >
                    {round.index + 1}
                  </th>
                  {players.map((player) => {
                    const picked = round.picks[player.userId]?.[0];
                    const isSpyCell = reveal?.spyUserId === player.userId;
                    // A blind pick is only knowable AFTER the reveal, which is
                    // the first time the hidden sets are public at all.
                    const blind = isSpyCell && picked !== undefined && hidden.has(picked);
                    return (
                      <td
                        key={player.userId}
                        className={cn(
                          "rounded-[9px] border p-1.5 text-center text-[11.5px]",
                          isSpyCell
                            ? "border-spy/30 bg-spy/[0.08] text-spy"
                            : "border-border bg-white/[0.02] text-foreground-secondary",
                        )}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <span className="max-w-[100px] truncate">
                            {picked ? (titleById.get(picked) ?? picked) : "—"}
                          </span>
                          {blind && (
                            <EyeOff
                              size={11}
                              aria-hidden
                              className="flex-none"
                            />
                          )}
                        </span>
                        {blind && (
                          <span className="sr-only">
                            {t("spy.reveal.hiddenBadge")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
