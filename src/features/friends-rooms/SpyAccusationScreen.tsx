"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, EyeOff, Loader2 } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { SpyPickTable } from "./SpyPickTable";
import type { RoomState } from "./room-types";

interface SpyAccusationScreenProps {
  state: RoomState;
  currentUserId: string | null;
  onAccuse: (userId: string) => void;
}

/**
 * The Spy endgame: the evidence on the left, one name to pick on the right.
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
  const [accused, setAccused] = useState<string | null>(null);
  const guessing = state.guessing;
  if (!guessing) return null;

  const iAmSpy = state.iAmSpy === true;
  // The spy never submits, so the denominator is the ACCUSERS. Measured against
  // the whole roster this line would stall one short in every single game.
  const accuserCount = Math.max(0, guessing.candidateUserIds.length - 1);
  const submitted = guessing.submitted.length;

  const candidates = state.players.filter(
    (player) => player.userId !== currentUserId,
  );

  function accuse(userId: string) {
    setAccused(userId);
    onAccuse(userId);
  }

  return (
    <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <SpyPickTable state={state} />

      <section
        aria-label={t("spy.accuse.heading")}
        className="flex flex-col gap-[14px] rounded-card border border-border bg-surface-card p-[18px]"
      >
        <div className="flex flex-col gap-1.5">
          <Text as="h2" className="text-base font-bold tracking-[-0.01em]">
            {t("spy.accuse.title")}
          </Text>
          <Text variant="secondary" className="text-[12.5px] leading-[1.45]">
            {iAmSpy ? t("spy.accuse.spyWaiting") : t("spy.accuse.instruction")}
          </Text>
        </div>

        {!iAmSpy && (
          <ul className="flex flex-col gap-2">
            {candidates.map((player) => {
              const mine = accused === player.userId;
              return (
                <li key={player.userId}>
                  <button
                    type="button"
                    onClick={() => accuse(player.userId)}
                    aria-pressed={mine}
                    aria-label={t("spy.accuse.choose", {
                      name: player.username,
                    })}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[12px] border px-[11px] py-[9px] text-start",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spy",
                      mine
                        ? "border-spy bg-spy/10"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    <UserAvatar
                      username={player.username}
                      avatarKey={player.avatarKey}
                      tone
                      className="h-[34px] w-[34px] flex-none rounded-full text-xs"
                    />
                    <Text className="min-w-0 truncate text-[13px] font-semibold">
                      {player.username}
                    </Text>
                    {mine && (
                      <Check
                        size={16}
                        aria-hidden
                        className="ms-auto flex-none text-spy"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
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

        <div
          role="status"
          className="flex items-center gap-2 border-t border-border pt-[11px]"
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
      </section>
    </div>
  );
}
