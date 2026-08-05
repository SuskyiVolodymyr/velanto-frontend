"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Crown, X } from "lucide-react";
import { BackButton } from "@/src/shared/components/BackButton";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { GuessWhoLabelTable } from "./GuessWhoLabelTable";
import { friendsRoomsClient } from "./friends-rooms-client";
import type { RoomState } from "./room-types";

/**
 * Guess-who's finished screen (Guess Who Results.dc.html): who won, the
 * evidence with every column named, and how each label's guess went for you.
 *
 * Two different things are on this page and they must not be confused. The
 * LEADERBOARD is public — `endgame.scores` says how well each player read the
 * room, derived from the mapping everyone has just been shown. The per-label
 * grading is the VIEWER'S OWN, from `myGuess`; the server never sends anyone
 * else's guess to this client, because a wrong guess names a specific person.
 */
export function IdentityRevealScreen({ state }: { state: RoomState }) {
  const t = useTranslations("room");
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  async function playAgain() {
    if (opening) return;
    setOpening(true);
    try {
      const room = await friendsRoomsClient.create(state.packId);
      // Left busy on purpose: we are navigating away, and flashing back to
      // idle before the route changes reads as a click that did nothing.
      router.push(`/rooms/${room.id}`);
    } catch {
      router.push(`/packs/${state.packId}`);
    }
  }

  // Narrowed: the public endgame is a union now that Spy has its own reveal.
  // This screen renders Guess-who's; RoomScreen only routes here for it.
  const endgame =
    state.endgame?.kind === "identity_reveal" ? state.endgame : null;
  const mapping = endgame?.mapping ?? {};
  const scores = endgame?.scores;
  const myGuess = state.myGuess ?? {};
  const playerById = new Map(state.players.map((p) => [p.userId, p]));
  const labels = Object.keys(mapping).sort();

  const board = scores
    ? Object.entries(scores)
        .map(([userId, points]) => ({
          player: playerById.get(userId),
          userId,
          points,
        }))
        .sort((a, b) => b.points - a.points)
    : [];
  // A shared top score is a shared win: there is no tiebreak in this mode, so
  // crowning whoever happens to sort first would invent one.
  const topScore = board.length > 0 ? board[0].points : 0;
  const winners = board.filter((entry) => entry.points === topScore);
  const soleWinner = winners.length === 1 ? winners[0] : null;

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Like RoomResults, this is a terminal state that does NOT leave on its
          own, and RoomScreen renders no room header over it — so without this
          the page's only exit was the pair down in the aside. A real link, so
          middle-click and open-in-new-tab work. */}
      <BackButton
        href={`/packs/${state.packId}`}
        label={t("results.backToPack")}
        className="self-start"
      />

      {soleWinner && (
        <section className="flex flex-wrap items-center gap-[18px] rounded-[20px] border border-score/35 bg-[linear-gradient(135deg,rgba(255,194,75,.16),rgba(255,194,75,.03))] p-[22px]">
          <span className="relative flex-none">
            <UserAvatar
              username={soleWinner.player?.username ?? soleWinner.userId}
              avatarKey={soleWinner.player?.avatarKey ?? null}
              className="h-16 w-16 rounded-full bg-surface-raised text-[22px] font-bold text-foreground ring-[2.5px] ring-score"
            />
            <span
              aria-hidden
              className="absolute -top-2.5 left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border-[3px] border-background bg-score text-background"
            >
              <Crown size={15} fill="currentColor" />
            </span>
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <Text
              as="p"
              className="text-[11px] font-bold tracking-[0.16em] text-score uppercase"
            >
              {t("identityReveal.winner")}
            </Text>
            <Text as="h1" className="text-[26px] font-bold tracking-[-0.02em]">
              {soleWinner.player?.username ?? soleWinner.userId}
            </Text>
            <Text variant="secondary" className="text-[13px]">
              {t("identityReveal.winnerNote", {
                count: soleWinner.points,
                total: labels.length,
              })}
            </Text>
          </div>
          <div className="ms-auto flex items-baseline gap-2">
            <span className="font-mono text-[46px] leading-none font-bold text-score">
              {soleWinner.points}
            </span>
            <Text variant="tertiary" className="text-[13px] font-semibold">
              {t("identityReveal.points")}
            </Text>
          </div>
        </section>
      )}

      {!soleWinner && winners.length > 1 && (
        <section className="flex items-center gap-[11px] rounded-[16px] border border-score/25 bg-score/[0.07] p-[15px]">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-score/[0.16] text-score">
            <Crown size={16} aria-hidden />
          </span>
          <Text className="text-[13px] font-semibold text-score">
            {t("identityReveal.sharedWin", {
              names: winners
                .map((w) => w.player?.username ?? w.userId)
                .join(", "),
              count: topScore,
            })}
          </Text>
        </section>
      )}

      <div className="grid items-start gap-[18px] min-[1080px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="max-[1079px]:order-2">
          <GuessWhoLabelTable state={state} revealed />
        </div>

        <aside className="flex flex-col gap-3.5 max-[1079px]:order-1">
          <section
            aria-label={t("identityReveal.yourGuess")}
            className="flex flex-col gap-[13px] rounded-[20px] border border-border bg-surface-card p-5"
          >
            <Text as="h2" className="text-base font-bold tracking-[-0.01em]">
              {t("identityReveal.yourGuess")}
            </Text>
            <ol className="flex flex-col gap-2">
              {labels.map((label) => {
                const truth = playerById.get(mapping[label]);
                const correct = myGuess[label] === mapping[label];
                const guessed = playerById.get(myGuess[label]);
                return (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-tile border p-3",
                      correct
                        ? "border-live/40 bg-live/10"
                        : "border-danger/40 bg-danger/10",
                    )}
                  >
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-chip bg-white/[0.06] font-mono text-xs font-bold">
                      {label}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Text className="truncate text-sm font-semibold">
                        {truth?.username ?? mapping[label]}
                      </Text>
                      {!correct && (
                        <Text variant="tertiary" className="text-[11.5px]">
                          {t("identityReveal.youSaid", {
                            name:
                              guessed?.username ?? t("identityReveal.nobody"),
                          })}
                        </Text>
                      )}
                    </div>
                    {/* The verdict must not ride on colour and an aria-hidden
                        icon alone — invisible to a screen reader and to anyone
                        who can't tell the green from the red. */}
                    <span className="sr-only">
                      {correct
                        ? t("identityReveal.correct")
                        : t("identityReveal.incorrect")}
                    </span>
                    {correct ? (
                      <Check
                        size={16}
                        aria-hidden
                        className="ms-auto text-live"
                      />
                    ) : (
                      <X
                        size={16}
                        aria-hidden
                        className="ms-auto text-danger"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          {board.length > 0 && (
            <section
              aria-label={t("leaderboard.heading")}
              className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface-card p-5"
            >
              <div className="flex items-baseline gap-[9px]">
                <Text
                  as="h2"
                  className="text-base font-bold tracking-[-0.01em]"
                >
                  {t("leaderboard.heading")}
                </Text>
                <Text variant="tertiary" className="ms-auto text-[11.5px]">
                  {t("identityReveal.pointPerMatch")}
                </Text>
              </div>
              <ol className="flex flex-col gap-[7px]">
                {board.map((entry, i) => {
                  const won = entry.points === topScore;
                  return (
                    <li
                      key={entry.userId}
                      className={cn(
                        "flex items-center gap-[11px] rounded-[13px] border p-[11px_12px]",
                        won
                          ? "border-score/30 bg-score/[0.07]"
                          : "border-border bg-background",
                      )}
                    >
                      <span
                        className={cn(
                          "w-4 font-mono text-[12.5px] font-bold",
                          won ? "text-score" : "text-foreground-tertiary",
                        )}
                      >
                        {i + 1}
                      </span>
                      <UserAvatar
                        username={entry.player?.username ?? entry.userId}
                        avatarKey={entry.player?.avatarKey ?? null}
                        className="h-8 w-8 flex-none rounded-full bg-surface-raised text-[11.5px] font-bold text-foreground"
                      />
                      <Text className="min-w-0 truncate text-[13.5px] font-semibold">
                        {entry.player?.username ?? entry.userId}
                      </Text>
                      <span
                        className={cn(
                          "ms-auto font-mono text-[15px] font-bold tabular-nums",
                          won ? "text-score" : "text-foreground-secondary",
                        )}
                      >
                        {entry.points}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* OUTSIDE the leaderboard, which only renders when somebody scored:
              `scores` is keyed on players who submitted a guess, so a game whose
              deadline passed with nobody guessing rendered no leaderboard — and
              took the only way off this screen down with it. Where you go next
              cannot depend on how the game went.

              Play again ALONE: "Back to pack" is the header link above, and the
              same destination twice on one screen is a choice that isn't one. */}
          <button
            type="button"
            disabled={opening}
            onClick={() => void playAgain()}
            className="grid h-11 place-items-center rounded-control bg-acc text-[13.5px] font-bold text-background transition-colors hover:bg-acc-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("results.playAgain")}
          </button>
        </aside>
      </div>
    </div>
  );
}
