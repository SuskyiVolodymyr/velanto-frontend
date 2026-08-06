"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EyeOff, Loader2 } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { PhaseDeadline } from "./PhaseDeadline";
import { SpyPickTable } from "./SpyPickTable";
import type { RoomState } from "./room-types";

interface SpyAccusationScreenProps {
  state: RoomState;
  currentUserId: string | null;
  onAccuse: (userId: string) => void;
}

/**
 * The Spy endgame: one name to pick, over the evidence you pick it from.
 *
 * The pick history is present HERE, not only afterwards, because it is what the
 * accusation is read from — a single round attributes nothing, and it is a
 * player's run of choices across the game that gives them away.
 *
 * The spy does not accuse. They are shown the same evidence and told to sit
 * tight: hiding the board from them at this point would tell them nothing they
 * do not already know, and giving them a control the server refuses would just
 * look broken.
 */
export function SpyAccusationScreen({
  state,
  currentUserId,
  onAccuse,
}: SpyAccusationScreenProps) {
  const t = useTranslations("room");
  // Chosen, then confirmed — two steps, not one. Naming someone was previously
  // the click itself, so a mis-tap accused a real person irreversibly, with no
  // moment in between to change your mind. The room's other endgame already
  // works this way (see GuessingPhaseScreen's Submit).
  const [selected, setSelected] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const guessing = state.guessing;
  if (!guessing) return null;

  // `myAccusation` arrives only with the reveal, but a re-mount mid-phase (a
  // reconnect) would otherwise offer a second accusation the server refuses.
  const alreadyAccused = sent || Boolean(state.myAccusation);

  const iAmSpy = state.iAmSpy === true;
  // The spy never submits, so the denominator is the ACCUSERS. Measured against
  // the whole roster this line would stall one short in every single game.
  const accuserCount = Math.max(0, guessing.candidateUserIds.length - 1);
  const submitted = guessing.submitted.length;

  const candidates = state.players.filter(
    (player) => player.userId !== currentUserId,
  );
  const chosen =
    candidates.find((player) => player.userId === selected) ?? null;

  function submit() {
    if (!selected || alreadyAccused) return;
    setSent(true);
    onAccuse(selected);
  }

  return (
    // Stacked, not two columns — same as Guess-who's endgame. Side by side,
    // the evidence board was squeezed into part of the width while the panel
    // held a narrow column of its own, and on 1v1 (two contenders per cell)
    // that is exactly the wrong way round. The order is the order of the task:
    // decide up here, read the evidence below.
    <div className="flex flex-col gap-[18px]">
      <section
        aria-label={t("spy.accuse.heading")}
        className="flex flex-col gap-[14px] rounded-card border border-border bg-surface-card p-[18px]"
      >
        {/* Centred, over the slot it names. Left-aligned it read as a card
            heading with the panel's controls arranged under it; the question
            IS the screen, and the answer goes in the middle. */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <Text as="h2" className="text-lg font-bold tracking-[-0.01em]">
            {t("spy.accuse.title")}
          </Text>
          <Text
            variant="secondary"
            className="max-w-[46ch] text-[12.5px] leading-[1.45] text-balance"
          >
            {iAmSpy ? t("spy.accuse.spyWaiting") : t("spy.accuse.instruction")}
          </Text>
        </div>

        {!iAmSpy && (
          // Three columns across the panel's full width: the roster to scan,
          // the slot to put someone in, and everything the phase is waiting on.
          // The panel spans the page, and with only the first two the middle
          // third was a 300px frame adrift in a field of nothing — while the
          // clock and the accuser count sat in a footer strip underneath it.
          // ONE grid-cols utility, not a two-column rule plus a three-column
          // one at a wider breakpoint: cn() is a plain join rather than
          // tailwind-merge, so both would emit and Tailwind's own order — not
          // the breakpoint — would pick the winner. It picked the narrow one,
          // which is how the status column ended up wrapped under the roster.
          <div className="grid items-center gap-5 md:grid-cols-[minmax(170px,230px)_minmax(0,1fr)_minmax(200px,250px)]">
            {/* Whoever is in the slot is not also in this list: they are in one
                place at a time, which is what makes moving them read as a move
                rather than as a highlight. */}
            <ul className="flex flex-col gap-2">
              {candidates
                .filter((player) => player.userId !== selected)
                .map((player) => (
                  <li key={player.userId}>
                    <button
                      type="button"
                      onClick={() => setSelected(player.userId)}
                      disabled={alreadyAccused}
                      aria-label={t("spy.accuse.choose", {
                        name: player.username,
                      })}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-full border py-[5px] pe-[15px] ps-[5px] text-start",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spy",
                        "border-border bg-surface hover:border-border-strong",
                        alreadyAccused && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <UserAvatar
                        username={player.username}
                        avatarKey={player.avatarKey}
                        tone
                        className="h-[30px] w-[30px] flex-none rounded-full text-[11px]"
                      />
                      <Text className="min-w-0 truncate text-[13px] font-semibold">
                        {player.username}
                      </Text>
                    </button>
                  </li>
                ))}
            </ul>

            {/* The accusation as ONE named slot rather than a selected row.
                A highlighted item in a list of four says "this is the one I
                clicked"; a person standing alone in a frame headed "who was
                the spy?" says what you are actually claiming — which is the
                weight this decision should carry before you confirm it.

                Empty, it is the same frame with nobody in it, so the gesture
                reads as putting someone there and taking them back out. */}
            <div className="relative flex justify-center py-1.5">
              {/* An interrogation lamp, basically. The slot is the one place on
                  the screen where something is at stake, and a plain bordered
                  box gave it no more presence than the chips under it. The glow
                  lifts when somebody is standing in it. */}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute top-1/2 left-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[48px] transition-colors duration-300",
                  chosen ? "bg-spy/40" : "bg-white/[0.05]",
                )}
              />
              <button
                type="button"
                onClick={() => setSelected(null)}
                disabled={!chosen || alreadyAccused}
                aria-label={t("spy.accuse.title")}
                className={cn(
                  // Fills its column instead of sitting at a fixed 300px in
                  // the middle of it — the frame IS the empty space, so
                  // letting it be small just moved the emptiness outside it.
                  "relative flex min-h-[236px] w-full max-w-[460px] flex-col items-center justify-center gap-3 rounded-[22px] border-2 transition-colors duration-200",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spy",
                  chosen
                    ? "border-spy bg-spy/[0.09]"
                    : "cursor-default border-dashed border-white/12 bg-background/70",
                  alreadyAccused && "cursor-not-allowed",
                )}
              >
                {/* Four corner brackets — a reticle around whoever is in the
                    frame. Drawn as L-shapes rather than a second full border,
                    which would just read as a doubled edge. */}
                {[
                  "top-2.5 left-2.5 rounded-tl-[9px] border-t-2 border-l-2",
                  "top-2.5 right-2.5 rounded-tr-[9px] border-t-2 border-r-2",
                  "bottom-2.5 left-2.5 rounded-bl-[9px] border-b-2 border-l-2",
                  "bottom-2.5 right-2.5 rounded-br-[9px] border-b-2 border-r-2",
                ].map((corner) => (
                  <span
                    key={corner}
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute h-4 w-4 transition-colors duration-200",
                      corner,
                      chosen ? "border-spy/80" : "border-white/15",
                    )}
                  />
                ))}

                {chosen ? (
                  <>
                    <UserAvatar
                      username={chosen.username}
                      avatarKey={chosen.avatarKey}
                      tone
                      className="h-[68px] w-[68px] flex-none rounded-full text-lg ring-2 ring-spy/50 ring-offset-2 ring-offset-surface-card"
                    />
                    <Text className="max-w-full truncate px-4 text-[15px] font-bold">
                      {chosen.username}
                    </Text>
                  </>
                ) : (
                  <span className="grid h-[68px] w-[68px] place-items-center rounded-full border border-dashed border-white/15 bg-white/[0.03] text-foreground-tertiary">
                    <EyeOff size={26} aria-hidden />
                  </span>
                )}
              </button>
            </div>

            {/* Everything the phase is waiting on, in the column that was
                empty: the clock (which this screen never drew at all, so a
                game could end mid-thought), who has answered, and the button.
                Guess-who's endgame already puts all three together. */}
            <div className="flex flex-col gap-2.5">
              {/* Keyed on the deadline so a new one remounts the clock rather
                  than animating down from a stale reading. */}
              <PhaseDeadline
                key={state.autoNextAt ?? "none"}
                at={state.autoNextAt}
                label={t("spy.accuse.deadline")}
              />

              {/* Styled like Guess-who's own Submit rather than a Button: the
                  two endgames are the same beat, and one arriving as a cyan
                  pill and the other as a full-width tile would read as two
                  different kinds of decision. */}
              <button
                type="button"
                disabled={!selected || alreadyAccused}
                onClick={submit}
                className={cn(
                  "h-12 rounded-[13px] text-[14.5px] font-bold transition-colors",
                  selected && !alreadyAccused
                    ? "bg-spy text-background hover:brightness-110"
                    : "cursor-not-allowed bg-white/[0.06] text-foreground-tertiary",
                )}
              >
                {t("spy.accuse.confirm")}
              </button>

              <div
                role="status"
                className="flex items-center justify-center gap-2"
              >
                {submitted < accuserCount && (
                  <Loader2
                    size={14}
                    aria-hidden
                    className="animate-spin text-foreground-tertiary motion-reduce:animate-none"
                  />
                )}
                <Text variant="tertiary" className="text-[12px]">
                  {t("spy.accuse.waiting", {
                    count: submitted,
                    total: accuserCount,
                  })}
                </Text>
              </div>
            </div>
          </div>
        )}

        {iAmSpy && (
          <div className="flex items-center gap-2.5 rounded-[13px] border border-spy/30 bg-spy/[0.08] px-[14px] py-3">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-spy text-background">
              <EyeOff size={15} aria-hidden />
            </span>
            <Text className="text-[13px] font-bold text-spy">
              {t("spy.youAreSpy")}
            </Text>
          </div>
        )}

        {/* The accuser's copy of this rides the status column above, beside
            the button it is about. The spy has no button, so theirs — the
            clock and the count — is the whole of what they get. */}
        {iAmSpy && (
          <div className="flex flex-col gap-2.5 border-t border-border pt-[11px]">
            <PhaseDeadline
              key={state.autoNextAt ?? "none"}
              at={state.autoNextAt}
              label={t("spy.accuse.deadline")}
            />
            <div role="status" className="flex items-center gap-2">
              {submitted < accuserCount && (
                <Loader2
                  size={14}
                  aria-hidden
                  className="animate-spin text-foreground-tertiary motion-reduce:animate-none"
                />
              )}
              <Text variant="tertiary" className="text-[12px]">
                {t("spy.accuse.waiting", {
                  count: submitted,
                  total: accuserCount,
                })}
              </Text>
            </div>
          </div>
        )}
      </section>

      <SpyPickTable state={state} />
    </div>
  );
}
