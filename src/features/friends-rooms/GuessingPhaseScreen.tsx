"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { labelTone } from "./guess-who-labels";
import { GuessWhoLabelTable } from "./GuessWhoLabelTable";
import { PhaseDeadline } from "./PhaseDeadline";
import type { RoomState } from "./room-types";

interface GuessingPhaseScreenProps {
  state: RoomState;
  onSubmit: (mapping: Record<string, string>) => void;
  /** The viewer, so their own label can be filled in rather than asked for. */
  currentUserId?: string | null;
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
  currentUserId,
}: GuessingPhaseScreenProps) {
  const t = useTranslations("room");
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const guessing = state.guessing;
  const playerById = useMemo(
    () => new Map(state.players.map((p) => [p.userId, p])),
    [state.players],
  );

  // Your own label is known to you — you have watched your own picks
  // accumulate all game — so it is filled in rather than asked for, and the
  // server no longer scores it either. The submitted mapping is still a full
  // bijection over every label, which is what the server validates.
  const myLabel =
    state.players.find((p) => p.userId === currentUserId)?.label ?? null;

  if (!guessing) return null;

  const fixed: Record<string, string> =
    myLabel && currentUserId && guessing.labels.includes(myLabel)
      ? { [myLabel]: currentUserId }
      : {};
  const filled = { ...assignment, ...fixed };
  // Placed on your own label, you cannot also be the answer to another one:
  // offering yourself there offers a move that breaks the bijection, and
  // taking it would silently unseat you from the label you actually hold.
  const candidates = fixed[myLabel ?? ""]
    ? guessing.candidateUserIds.filter((id) => id !== currentUserId)
    : guessing.candidateUserIds;

  const alreadySubmitted = state.myGuess !== null;
  const assignedCount = guessing.labels.filter((l) => filled[l]).length;
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
    // Stacked, not two columns. Side by side, the panel had a narrow column of
    // its own while the table — the thing you are actually reading — was
    // squeezed into the rest, and on 1v1 that meant eight titles fighting for
    // half the width. The order is the order of the task: decide up here, read
    // the evidence below.
    <div className="flex flex-col gap-[18px]">
      <aside className="flex flex-col gap-3.5">
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

          {/* Keyed on the deadline so a new one remounts the clock rather than
              animating down from a stale reading. */}
          <PhaseDeadline
            key={state.autoNextAt ?? "none"}
            at={state.autoNextAt}
            label={t("guessing.deadline")}
          />

          {/* Across, not down: the panel spans the page now, and a single
              column of label cards would leave most of that width empty while
              pushing the table — the thing this panel is answered FROM — below
              the fold. */}
          <div className="grid gap-[9px] sm:grid-cols-2 min-[1080px]:grid-cols-4">
            {guessing.labels.map((label) => {
              const chosen = filled[label];
              const isMine = label === myLabel && Boolean(fixed[label]);
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
                    {/* The label's own colour, the same one it wears on the
                      round cards and in the table above. Every chip here was
                      the same accent, which makes the colouring elsewhere
                      pointless — following one label across the game is the
                      only thing this screen asks you to do. */}
                    <span
                      className={cn(
                        "grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] text-sm font-extrabold",
                        labelTone(guessing.labels, label).chip,
                      )}
                    >
                      {label}
                    </span>
                    <Text className="text-[13px] font-semibold">
                      {t("guessing.whoIs", { label })}
                    </Text>
                  </legend>

                  {isMine ? (
                    // Fixed, not a disabled chip row: there is no choice to
                    // present, and a greyed-out set of people you cannot pick
                    // reads as something broken rather than something settled.
                    <div className="flex items-center gap-[7px]">
                      <UserAvatar
                        username={
                          playerById.get(currentUserId!)?.username ??
                          currentUserId!
                        }
                        avatarKey={
                          playerById.get(currentUserId!)?.avatarKey ?? null
                        }
                        className="h-[26px] w-[26px] flex-none rounded-full bg-surface-raised text-[10px] font-bold text-foreground"
                      />
                      <Text className="text-[12.5px] font-semibold">
                        {playerById.get(currentUserId!)?.username ??
                          currentUserId}
                      </Text>
                      <span className="rounded-chip bg-white/[0.08] px-1.5 py-px text-[10px] font-bold tracking-[0.04em] text-foreground-secondary uppercase">
                        {t("lobby.you")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-[7px]">
                      {candidates.map((userId) => {
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
                              alreadySubmitted &&
                                "cursor-not-allowed opacity-50",
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
                  )}
                </fieldset>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!complete || alreadySubmitted}
            onClick={() => onSubmit(filled)}
            className={cn(
              "h-12 rounded-[13px] text-[14.5px] font-bold transition-colors",
              complete && !alreadySubmitted
                ? "bg-acc text-background hover:bg-acc-hover"
                : "cursor-not-allowed bg-white/[0.06] text-foreground-tertiary",
            )}
          >
            {t("guessing.submit")}
          </button>
          {/* Beside the button, not only in the post-submit banner below: until
              you had submitted, nothing on the screen said what the room was
              waiting for — you pressed Submit, nothing visibly happened, and
              the next thing you saw was the results. */}
          <Text
            variant="tertiary"
            aria-live="polite"
            className="text-center text-[11.5px] font-semibold"
          >
            {t("guessing.waitingForOthers", {
              count: guessing.submitted.length,
              total: state.players.length,
            })}
          </Text>
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
            {/* The count lives beside Submit now, where it is visible BEFORE
                you have submitted too. This banner keeps only what is specific
                to having submitted. */}
            <Text variant="tertiary" className="text-[11.5px]">
              {t("guessing.revealsAtOnce")}
            </Text>
          </div>
        )}
      </aside>

      <GuessWhoLabelTable state={state} />
    </div>
  );
}
