"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { GuessWhoLabelTable } from "./GuessWhoLabelTable";
import type { RoomState } from "./room-types";

interface GuessingPhaseScreenProps {
  state: RoomState;
  onSubmit: (mapping: Record<string, string>) => void;
}

/**
 * The Guess-who endgame (Guess Who Results.dc.html): the evidence on the left,
 * the assignment panel on the right.
 *
 * Player chips rather than a `<select>` per label — you are reading a column of
 * picks and pointing at whoever it sounds like, and a dropdown hides the roster
 * behind a click at exactly the moment you want to compare people. The
 * bijection is enforced by clearing any OTHER label already holding the player
 * just picked, so two labels can never point at the same person client-side;
 * the server re-validates regardless (GUESS_REJECTION_REASONS.malformed).
 */
export function GuessingPhaseScreen({
  state,
  onSubmit,
}: GuessingPhaseScreenProps) {
  const t = useTranslations("room");
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const guessing = state.guessing;
  const playerById = useMemo(
    () => new Map(state.players.map((p) => [p.userId, p])),
    [state.players],
  );

  if (!guessing) return null;

  const alreadySubmitted = state.myGuess !== null;
  const assignedCount = guessing.labels.filter((l) => assignment[l]).length;
  const complete = assignedCount === guessing.labels.length;

  function assign(label: string, userId: string) {
    setAssignment((prev) => {
      // Picking the same person again clears the label — the only way to undo
      // an assignment without having somewhere else to put them.
      if (prev[label] === userId) {
        const next = { ...prev };
        delete next[label];
        return next;
      }
      // Picking someone already assigned elsewhere IS the swap gesture, so the
      // other label is cleared rather than the option being hidden from it.
      const next: Record<string, string> = {};
      for (const [existing, existingUserId] of Object.entries(prev)) {
        if (existingUserId !== userId) next[existing] = existingUserId;
      }
      next[label] = userId;
      return next;
    });
  }

  return (
    <div className="grid items-start gap-[18px] min-[1080px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="max-[1079px]:order-2">
        <GuessWhoLabelTable state={state} />
      </div>

      <aside className="flex flex-col gap-3.5 max-[1079px]:order-1">
        <section
          aria-label={t("guessing.title")}
          className="flex flex-col gap-[13px] rounded-[20px] border border-border bg-surface-card p-5"
        >
          <div className="flex flex-wrap items-baseline gap-[9px]">
            <Text as="h2" className="text-base font-bold tracking-[-0.01em]">
              {t("guessing.title")}
            </Text>
            <Text
              className={cn(
                "ms-auto text-[11.5px] font-semibold",
                complete ? "text-live" : "text-foreground-tertiary",
              )}
            >
              {t("guessing.assignedCount", {
                count: assignedCount,
                total: guessing.labels.length,
              })}
            </Text>
          </div>

          {guessing.labels.map((label) => {
            const chosen = assignment[label];
            return (
              <fieldset
                key={label}
                className={cn(
                  "flex flex-col gap-[9px] rounded-tile border p-3",
                  chosen
                    ? "border-acc/35 bg-acc/[0.06]"
                    : "border-border bg-background",
                )}
              >
                <legend className="flex items-center gap-2.5">
                  <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] border border-acc/30 bg-acc/[0.12] text-sm font-extrabold text-acc-hover">
                    {label}
                  </span>
                  <Text className="text-[13px] font-semibold">
                    {t("guessing.whoIs", { label })}
                  </Text>
                </legend>

                <div className="flex flex-wrap gap-[7px]">
                  {guessing.candidateUserIds.map((userId) => {
                    const player = playerById.get(userId);
                    const picked = chosen === userId;
                    return (
                      <button
                        key={userId}
                        type="button"
                        aria-pressed={picked}
                        disabled={alreadySubmitted}
                        onClick={() => assign(label, userId)}
                        className={cn(
                          "flex h-9 items-center gap-[7px] rounded-full border py-0 ps-[5px] pe-3 text-[12.5px] font-semibold transition-colors",
                          picked
                            ? "border-acc bg-acc/[0.16] text-foreground"
                            : "border-border-strong text-foreground-secondary hover:text-foreground",
                          alreadySubmitted && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <UserAvatar
                          username={player?.username ?? userId}
                          avatarKey={player?.avatarKey ?? null}
                          className="h-[26px] w-[26px] flex-none rounded-full bg-surface-raised text-[10px] font-bold text-foreground"
                        />
                        {player?.username ?? userId}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <button
            type="button"
            disabled={!complete || alreadySubmitted}
            onClick={() => onSubmit(assignment)}
            className={cn(
              "h-12 rounded-[13px] text-[14.5px] font-bold transition-colors",
              complete && !alreadySubmitted
                ? "bg-acc text-background hover:bg-acc-hover"
                : "cursor-not-allowed bg-white/[0.06] text-foreground-tertiary",
            )}
          >
            {t("guessing.submit")}
          </button>
          <Text variant="tertiary" className="text-[11.5px] leading-[1.45]">
            {t("guessing.instruction")}
          </Text>
        </section>

        {alreadySubmitted && (
          <div className="flex items-center gap-[11px] rounded-[16px] border border-score/25 bg-score/[0.07] p-[15px]">
            <Loader2
              size={14}
              aria-hidden
              className="flex-none animate-spin text-score"
            />
            <div className="flex flex-col gap-0.5">
              <Text className="text-[13px] font-semibold text-score">
                {t("guessing.waitingForOthers", {
                  count: guessing.submitted.length,
                  total: state.players.length,
                })}
              </Text>
              <Text variant="tertiary" className="text-[11.5px]">
                {t("guessing.revealsAtOnce")}
              </Text>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
