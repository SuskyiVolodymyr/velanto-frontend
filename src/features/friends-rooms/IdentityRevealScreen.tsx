"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { BackButton } from "@/src/shared/components/BackButton";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import type { RoomState } from "./room-types";

/**
 * Guess-who's finished screen (design brief §4.3(d)/#3-4, §4.4 "Scored
 * results / winner"). Grades ONLY the viewer's own guess against the public
 * `endgame.mapping` (green = correct, red = wrong) — the server never sends
 * anyone else's guess to this client, so this is the one honest computation
 * this screen can do. A full leaderboard needs a PER-PLAYER SCORE field the
 * current `RoomState` contract does not carry (only `myGuess`, the caller's
 * own submission) — flagged explicitly rather than invented: this screen
 * shows a "scores available once every player's total ships" note in place of
 * RoomLeaderboard until that backend field exists. File as a backend follow-up
 * (a `scores: Record<userId, number>` on `RoomState` or on the `identity.
 * revealed` payload) rather than guessing at a shape here.
 */
export function IdentityRevealScreen({ state }: { state: RoomState }) {
  const t = useTranslations("room");
  const mapping = state.endgame?.mapping ?? {};
  const myGuess = state.myGuess ?? {};
  const usernameByUserId = new Map(
    state.players.map((p) => [p.userId, p.username]),
  );
  const labels = Object.keys(mapping);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("identityReveal.heading")}
        </Text>
        <Text as="h1" variant="title" className="text-2xl">
          {state.packTitle}
        </Text>
      </header>

      <BackButton
        href={`/packs/${state.packId}`}
        label={t("results.backToPack")}
      />

      <ol className="flex flex-col gap-2">
        {labels.map((label) => {
          const trueUserId = mapping[label];
          const myGuessUserId = myGuess[label];
          const correct = myGuessUserId === trueUserId;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-tile border p-3",
                correct
                  ? "border-live/40 bg-live/10"
                  : "border-danger/40 bg-danger/10",
              )}
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-chip bg-white/[0.06] font-mono text-xs font-bold">
                {label}
              </span>
              <Text className="flex-1 text-sm font-semibold">
                {usernameByUserId.get(trueUserId) ?? trueUserId}
              </Text>
              {/* The correct/wrong verdict must not be carried by color (and
                  an aria-hidden icon) alone — that is invisible to screen
                  readers and to anyone who can't distinguish the green/red
                  tint. The icon stays decorative; the sr-only text is the
                  accessible signal. */}
              <span className="sr-only">
                {correct
                  ? t("identityReveal.correct")
                  : t("identityReveal.incorrect")}
              </span>
              {correct ? (
                <Check size={16} aria-hidden className="text-live" />
              ) : (
                <X size={16} aria-hidden className="text-danger" />
              )}
            </li>
          );
        })}
      </ol>

      <Text variant="tertiary" className="text-sm">
        {t("identityReveal.scoresPending")}
      </Text>
    </div>
  );
}
