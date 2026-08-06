"use client";

import { useTranslations } from "next-intl";
import { Check, EyeOff, X } from "lucide-react";
import { BackButton } from "@/src/shared/components/BackButton";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { RoomLeaderboard } from "./RoomLeaderboard";
import { SpyPickTable } from "./SpyPickTable";
import type { RoomState } from "./room-types";

interface SpyRevealScreenProps {
  state: RoomState;
  currentUserId: string | null;
}

/**
 * The Spy endgame's reveal: who it was, how you called it, the leaderboard, and
 * — public for the first time — what the spy could actually see each round.
 *
 * The recap is the payoff of the whole mode. It is held back all game because
 * mid-game it is the loudest possible tell ("the spy could only see A and B"
 * narrows a room to one or two people instantly); afterwards it is what makes
 * the game readable in hindsight.
 */
export function SpyRevealScreen({ state, currentUserId }: SpyRevealScreenProps) {
  const t = useTranslations("room");
  const endgame = state.endgame?.kind === "spy_reveal" ? state.endgame : null;
  if (!endgame) return null;

  const playerById = new Map(state.players.map((p) => [p.userId, p]));
  const spy = playerById.get(endgame.spyUserId) ?? null;
  const iAmSpy = currentUserId === endgame.spyUserId;
  const myAccusation = state.myAccusation ?? null;
  const accused = myAccusation ? playerById.get(myAccusation) : null;
  const calledIt = myAccusation === endgame.spyUserId;

  const scores = endgame.scores;
  const accuserCount = Math.max(0, state.players.length - 1);
  // How many accusers looked elsewhere. It is the spy's own score, which is
  // exactly what that number means, rather than a second thing to compute.
  const missed = scores?.[endgame.spyUserId] ?? 0;

  const board = scores
    ? Object.entries(scores)
        .map(([userId, score]) => {
          const player = playerById.get(userId);
          return {
            userId,
            username: player?.username ?? userId,
            avatarKey: player?.avatarKey ?? null,
            score,
          };
        })
        .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    : [];

  return (
    <div className="flex flex-col gap-[18px]">
      {/* This screen heads itself and offers its own way out, because the room
          header (with Leave) is gone by the time a game is finished. Without
          both, a finished room was a page with no title and no exit — the same
          reason RoomResults carries them. */}
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs tracking-wide uppercase">
          {t("results.heading")}
        </Text>
        <Text as="h1" variant="title" className="text-2xl">
          {state.packTitle}
        </Text>
      </header>

      <BackButton
        href={`/packs/${state.packId}`}
        label={t("results.backToPack")}
      />

      <section
        aria-label={t("spy.reveal.heading")}
        className="flex flex-wrap items-center gap-[14px] rounded-card border border-spy/30 bg-spy/[0.07] p-[18px]"
      >
        <span className="grid h-14 w-14 flex-none place-items-center rounded-[16px] bg-spy text-background">
          <EyeOff size={24} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          {/* h2: the pack title above is the page's h1 now that this screen
              heads itself. */}
          <Text as="h2" variant="title" className="text-2xl">
            {iAmSpy
              ? t("spy.reveal.youWere")
              : t("spy.reveal.spyWas", { name: spy?.username ?? "" })}
          </Text>
          <Text variant="secondary" className="text-[13px]">
            {missed > 0
              ? t("spy.reveal.escaped", {
                  count: missed,
                  total: accuserCount,
                })
              : t("spy.reveal.caught")}
          </Text>
        </div>

        {!iAmSpy && (
          <div
            className={cn(
              "ms-auto flex items-center gap-2.5 rounded-[13px] border px-[14px] py-2.5",
              myAccusation === null
                ? "border-border bg-surface"
                : calledIt
                  ? "border-success/40 bg-success/10"
                  : "border-danger/40 bg-danger/10",
            )}
          >
            {myAccusation !== null &&
              (calledIt ? (
                <Check size={16} aria-hidden className="text-success" />
              ) : (
                <X size={16} aria-hidden className="text-danger" />
              ))}
            <div className="flex flex-col">
              <Text className="text-[12.5px] font-semibold">
                {myAccusation === null
                  ? t("spy.reveal.noAccusation")
                  : t("spy.reveal.yourAccusation", {
                      name: accused?.username ?? "",
                    })}
              </Text>
              {myAccusation !== null && (
                <Text variant="tertiary" className="text-[11.5px]">
                  {calledIt
                    ? t("spy.reveal.correct")
                    : t("spy.reveal.incorrect")}
                </Text>
              )}
            </div>
          </div>
        )}
      </section>

      {board.length > 0 && <RoomLeaderboard entries={board} />}

      <SpyPickTable
        state={state}
        reveal={{
          spyUserId: endgame.spyUserId,
          hiddenByRound: endgame.hiddenByRound,
        }}
      />

      <section
        aria-label={t("spy.reveal.recapHeading")}
        className="flex flex-col gap-[13px] rounded-card border border-border bg-surface-card p-5"
      >
        <Text as="h2" className="text-base font-bold tracking-[-0.01em]">
          {t("spy.reveal.recapHeading")}
        </Text>
        <ul className="flex flex-col gap-2">
          {endgame.hiddenByRound.map((hiddenIds, index) => {
            const round = state.results.find(
              (result) => result.kind === "spy_round" && result.index === index,
            );
            const total =
              round && round.kind === "spy_round"
                ? Math.max(round.items.length, hiddenIds.length)
                : hiddenIds.length;
            return (
              <li
                key={index}
                className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-[13px] py-2.5"
              >
                <span className="font-mono text-[11px] font-bold text-foreground-tertiary tabular-nums">
                  {index + 1}
                </span>
                <Text variant="secondary" className="text-[12.5px]">
                  {t("spy.reveal.sawCount", {
                    count: Math.max(0, total - hiddenIds.length),
                    total,
                  })}
                </Text>
                <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-spy/15 px-2 py-0.5 text-[10.5px] font-bold text-spy">
                  <EyeOff size={10} aria-hidden />
                  {hiddenIds.length}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
