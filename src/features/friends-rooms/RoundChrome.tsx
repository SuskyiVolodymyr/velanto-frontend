"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Crown, Info } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { labelTone } from "./guess-who-labels";
import { MODE_STEP_KEYS } from "./room-mode-copy";
import type { RoomPlayerState, RoomState } from "./room-types";

/** How one player is doing this round, as the Room panel should read it. */
export interface RoundPlayerStatus {
  /** Short label under the name — "Voted", "Deciding…", "Cutting now". */
  label: string;
  /** They have done their bit: green tint + tick. */
  done?: boolean;
  /** The round is waiting on THEM specifically (turn-based modes). */
  active?: boolean;
  /** Voting's tiebreak holder — crowned. */
  priority?: boolean;
}

export interface RoundCall {
  /** The one-line instruction, e.g. "Your turn — remove one". */
  title: string;
  /** Right-aligned qualifier, e.g. "No takebacks once it's gone". */
  hint?: string;
  /** Whether the room is waiting on the VIEWER — lights the banner up. */
  yours: boolean;
  icon: ReactNode;
}

interface RoundChromeProps {
  state: RoomState;
  /** The question under the round name — each mode's own instruction. */
  question: string;
  /** Right of the step pips, e.g. "3 of 4 votes in". */
  progressNote: string;
  call: RoundCall;
  /** The mode's own board — the left column. */
  children: ReactNode;
  /** A mode-specific panel under Room (live tally, cut log). */
  asidePanel?: ReactNode;
  status: (player: RoomPlayerState) => RoundPlayerStatus;
  /** Marks the viewer's own row — the only place guess-who's masked roster
   * says which label is yours. */
  currentUserId: string | null;
}

/**
 * The shared round layout (Room Round.dc.html): the round's identity and
 * progress across the top, the mode's board on the left, and who-is-doing-what
 * on the right.
 *
 * Every mode renders through this, so a player moving between rooms reads the
 * same page in the same places — only the board and one aside panel change.
 * It also means the round heading lives in exactly one component; boards used
 * to each write their own, which is why the page had two competing headers.
 */
export function RoundChrome({
  state,
  question,
  progressNote,
  call,
  children,
  asidePanel,
  status,
  currentUserId,
}: RoundChromeProps) {
  const t = useTranslations("room");
  const round = state.round;
  if (!round) return null;

  const total = state.totalRounds;
  const present = state.players.filter((p) => p.connected);

  return (
    <div className="flex flex-col gap-[18px]">
      <section className="flex flex-wrap items-center gap-3.5">
        <span className="grid h-14 w-14 flex-none place-items-center rounded-[16px] border border-acc/[0.28] bg-acc/10">
          <span className="font-mono text-[22px] leading-none font-bold text-acc-hover">
            {round.index + 1}
          </span>
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Text
            variant="tertiary"
            className="text-[11px] font-bold tracking-[0.14em] uppercase"
          >
            {t("round.heading", { index: round.index + 1, total })}
          </Text>
          <Text
            as="h2"
            variant="title"
            className="text-[28px] tracking-[-0.025em] text-pretty max-[720px]:text-[19px]"
          >
            {/* Rounds are usually named (the author's name, or the drawn
                pool's). An unnamed one promotes the question rather than
                heading the page with an empty line. */}
            {round.name || question}
          </Text>
          {round.name && (
            <Text variant="secondary" className="text-sm font-semibold">
              {question}
            </Text>
          )}
        </div>
        {/* One pip per round, the current one half-lit. Only meaningful once the
            plan is drawn — totalRounds is 0 in the lobby, never here. */}
        <div className="ms-auto flex min-w-[170px] flex-col gap-[7px]">
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: Math.max(total, 1) }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i < round.index
                    ? "bg-acc"
                    : i === round.index
                      ? "bg-acc/45"
                      : "bg-white/[0.08]",
                )}
              />
            ))}
          </div>
          {/* Announced, not just shown: "everyone has voted" is the moment
              the round is about to resolve, and it is the one line that says
              so. Boards used to carry their own live region for this, which
              read the same sentence out twice. */}
          <Text
            variant="tertiary"
            aria-live="polite"
            className="text-end text-[11.5px]"
          >
            {progressNote}
          </Text>
        </div>
      </section>

      {/* The aside is CAPPED rather than proportional. As `1fr` against the
          board's `1.45fr` it kept growing with the viewport, so on a wide
          screen a list of three names and a one-line note took ~40% of the
          page while the videos — the thing being decided — were squeezed into
          what was left. It holds a roster and a hint; past ~320px it is only
          padding, and every pixel it gives back goes to the board. */}
      <div className="grid items-start gap-[18px] min-[1080px]:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <section className="flex flex-col gap-3.5 max-[1079px]:order-2">
          <div
            className={cn(
              "flex items-center gap-[11px] rounded-[15px] border p-[13px_15px]",
              call.yours
                ? "border-acc/40 bg-acc/10"
                : "border-border bg-white/[0.04]",
            )}
          >
            <span
              className={cn(
                "grid h-[30px] w-[30px] flex-none place-items-center rounded-full",
                call.yours
                  ? "bg-acc text-background"
                  : "bg-white/[0.09] text-foreground-secondary",
              )}
            >
              {call.icon}
            </span>
            <Text className="text-sm font-bold">{call.title}</Text>
            {call.hint && (
              <Text
                variant="tertiary"
                className="ms-auto text-end text-xs text-pretty"
              >
                {call.hint}
              </Text>
            )}
          </div>

          {children}
        </section>

        <aside className="flex flex-col gap-3.5 max-[1079px]:order-1">
          <section
            aria-label={t("board.room")}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface-card p-[18px]"
          >
            <div className="flex items-center gap-[9px]">
              <Text as="h3" className="text-[15px] font-bold">
                {t("board.room")}
              </Text>
              <span className="ms-auto flex items-center gap-1.5 rounded-full bg-live/10 px-2.5 py-1 text-[11.5px] font-semibold text-live">
                <span className="h-1.5 w-1.5 flex-none animate-pulse rounded-full bg-live" />
                {t("board.here", { count: present.length })}
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {state.players.map((player) => {
                const s = status(player);
                // Guess-who plays under anonymous labels, so the row keeps its
                // whole shape — status, tick, tint — and only the two things
                // that name a person are swapped for the letter. Your own row
                // is marked: you can read your label off your own picks at the
                // reveal anyway, so hiding it costs you the ability to follow
                // your own column and buys nothing.
                const label = player.label;
                const isMe = player.userId === currentUserId;
                return (
                  <li
                    key={player.userId}
                    className={cn(
                      "flex items-center gap-2.5 rounded-control border p-[9px_11px]",
                      s.active
                        ? "border-acc/35 bg-acc/[0.07]"
                        : s.done
                          ? "border-live/20 bg-live/[0.05]"
                          : "border-border bg-background",
                    )}
                  >
                    <span className="relative flex-none">
                      {label ? (
                        <span
                          className={cn(
                            "grid h-[34px] w-[34px] place-items-center rounded-full text-[13px] font-extrabold",
                            labelTone(state.labels ?? [label], label).chip,
                          )}
                        >
                          {label}
                        </span>
                      ) : (
                        <UserAvatar
                          username={player.username}
                          avatarKey={player.avatarKey}
                          className={cn(
                            "h-[34px] w-[34px] rounded-full bg-surface-raised text-xs font-bold text-foreground",
                            s.priority && "ring-2 ring-score",
                          )}
                        />
                      )}
                      {/* Named, not decorative: the crown is the only thing
                          saying who a tie favours, and "why is that one gold?"
                          is not a question the board should leave open. */}
                      {s.priority && (
                        <span
                          role="img"
                          aria-label={t("priority.holder", {
                            name: player.username,
                          })}
                          title={t("priority.holder", {
                            name: player.username,
                          })}
                          className="absolute -top-1.5 left-1/2 grid h-[18px] w-[18px] -translate-x-1/2 place-items-center rounded-full border-2 border-surface-card bg-score text-background"
                        >
                          <Crown size={10} fill="currentColor" aria-hidden />
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-foreground">
                          {label ?? player.username}
                        </span>
                        {label && isMe && (
                          <span className="flex-none rounded-chip bg-white/[0.08] px-1.5 py-px text-[10px] font-bold tracking-[0.04em] text-foreground-secondary uppercase">
                            {t("lobby.you")}
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "text-[11.5px] font-semibold",
                          s.active
                            ? "text-acc-hover"
                            : s.done
                              ? "text-live"
                              : "text-foreground-tertiary",
                        )}
                      >
                        {s.label}
                      </span>
                    </span>
                    {s.done && (
                      <span
                        aria-hidden
                        className="ms-auto grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-live/[0.18] text-live"
                      >
                        <Check size={12} strokeWidth={3.2} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {asidePanel}

          {/* The mock's closing note explains how the round resolves. That is
              exactly what the mode's own third "how a round goes" step says, so
              it is reused rather than written twice and translated twice. */}
          {state.mode && (
            <div className="flex items-center gap-2.5 rounded-[16px] border border-border bg-white/[0.03] p-[14px_15px]">
              <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-chip bg-acc/[0.12] text-acc-hover">
                <Info size={14} aria-hidden />
              </span>
              <Text
                variant="tertiary"
                className="text-[11.5px] leading-[1.45] text-pretty"
              >
                {t(`${MODE_STEP_KEYS[state.mode][2]}.body`)}
              </Text>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
