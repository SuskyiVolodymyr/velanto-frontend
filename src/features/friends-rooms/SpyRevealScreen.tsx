"use client";

import { useTranslations } from "next-intl";
import { Check, EyeOff, X } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { RoomLeaderboard } from "./RoomLeaderboard";
import {
  RoomResultAgainPanel,
  RoomResultHero,
  RoomTopPickedBoard,
} from "./RoomResultAside";
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
export function SpyRevealScreen({
  state,
  currentUserId,
}: SpyRevealScreenProps) {
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
        .sort(
          (a, b) => b.score - a.score || a.username.localeCompare(b.username),
        )
    : [];

  return (
    <div className="flex flex-col gap-[18px]">
      {/* The same opening statement Voting's and Guess-who's results screens
          get — one screen family, one header. It replaces this screen's own
          eyebrow-and-title pair plus a lone back link; the aside now carries
          the way out, beside Play again. */}
      <RoomResultHero state={state} />

      <section
        aria-label={t("spy.reveal.heading")}
        className="flex flex-wrap items-center gap-[14px] rounded-card border border-spy/30 bg-spy/[0.07] p-[18px]"
      >
        <span className="grid h-14 w-14 flex-none place-items-center rounded-[16px] bg-spy text-background">
          <EyeOff size={24} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          {/* h2: the hero above carries the page's h1. */}
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

      {/* The same column split every room results screen uses. */}
      <div className="grid grid-cols-1 items-start gap-[18px] min-[1040px]:grid-cols-[minmax(0,1fr)_minmax(0,330px)]">
        <div className="flex min-w-0 flex-col gap-[14px]">
          <SpyPickTable
            state={state}
            reveal={{
              spyUserId: endgame.spyUserId,
              hiddenByRound: endgame.hiddenByRound,
            }}
          />
        </div>

        <aside className="flex flex-col gap-[14px] max-[1039px]:contents">
          <RoomResultAgainPanel
            packId={state.packId}
            className="max-[1039px]:order-first"
          />

          {board.length > 0 && (
            <section
              aria-label={t("leaderboard.heading")}
              className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface-card p-5"
            >
              <Text as="h2" className="text-base font-bold tracking-[-0.01em]">
                {t("leaderboard.heading")}
              </Text>
              <RoomLeaderboard entries={board} />
            </section>
          )}

          {/* Under the leaderboard, so the aside reads next-step → how it went
              → what the room picked, exactly as Guess-who's does. */}
          <RoomTopPickedBoard state={state} currentUserId={currentUserId} />
        </aside>
      </div>
    </div>
  );
}
