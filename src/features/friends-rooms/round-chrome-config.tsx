"use client";

import type { ReactNode } from "react";
import { ArrowRight, Eye, Hand, ListOrdered, Lock } from "lucide-react";
import type { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import type { RoundCall, RoundPlayerStatus } from "./RoundChrome";
import type { RoomPlayerState, RoomState } from "./room-types";

type T = ReturnType<typeof useTranslations>;

export interface RoundChromeConfig {
  question: string;
  progressNote: string;
  call: RoundCall;
  status: (player: RoomPlayerState) => RoundPlayerStatus;
  /** A mode-specific panel under Room, when the mode has one. */
  asidePanel?: ReactNode;
}

/**
 * The chrome's per-mode wiring for the modes whose boards have nothing extra to
 * put in the aside — Claim, Guess-who, Shared-grid and Relay.
 *
 * Voting and Turn-based cut render {@link RoundChrome} themselves, because each
 * has its own aside panel (the live tally, the cut log) that only that board
 * knows how to build. Everything else is the same four answers — what am I
 * being asked, how far along is the room, whose move is it, and how is each
 * player doing — so they are answered once, here, rather than four times.
 */
export function roundChromeConfig(
  state: RoomState,
  currentUserId: string | null,
  t: T,
): RoundChromeConfig | null {
  const round = state.round;
  if (!round) return null;
  const seated = state.players.length;

  switch (state.mode) {
    case "claim": {
      // Every SEATED player, not just the connected ones: a dropped player
      // keeps their seat and the round waits for them, so counting only the
      // connected would imply it can resolve with an empty chair.
      const claimed = Object.keys(round.claims).length;
      const mine = currentUserId ? round.claims[currentUserId] : undefined;
      return {
        question: t("round.instructionSacrifice"),
        progressNote: t("round.chosen", { count: claimed, total: seated }),
        call: {
          yours: mine === undefined,
          icon: <Hand size={15} aria-hidden />,
          title: mine ? t("board.claimed") : t("board.claimPrompt"),
          hint: t("board.claimHint"),
        },
        status: (player) => {
          const acted = round.claims[player.userId] !== undefined;
          return {
            label: acted ? t("board.claimed") : t("board.deciding"),
            done: acted,
          };
        },
      };
    }

    case "guess_who":
    case "shared_grid": {
      const locked = round.lockedIn ?? [];
      const iAmLocked = currentUserId ? locked.includes(currentUserId) : false;
      const blind = state.mode === "guess_who";
      return {
        question: blind
          ? round.actionKind === "rank"
            ? t("guessWho.rankInstruction")
            : t("guessWho.pickInstruction")
          : t("sharedGrid.instruction"),
        progressNote: t("lockedIn.count", {
          count: locked.length,
          total: seated,
        }),
        call: {
          yours: !iAmLocked,
          icon: iAmLocked ? (
            <Lock size={15} aria-hidden />
          ) : (
            <Eye size={15} aria-hidden />
          ),
          title: iAmLocked ? t("board.lockedWaiting") : t("board.lockInPrompt"),
          // A guess-who PICK round is no longer blind — each label's choice
          // shows as it lands — so it must not promise that nobody sees it.
          // Rank rounds and shared-grid still are, and keep the old line.
          hint:
            blind && round.actionKind === "pick"
              ? t("guessWho.pickHint")
              : t("board.blindHint"),
        },
        status: (player) => {
          const done = locked.includes(player.userId);
          return {
            label: done ? t("board.lockedIn") : t("board.deciding"),
            done,
          };
        },
      };
    }

    case "relay": {
      const placements = round.relayPlacements ?? [];
      const placed = (round.relayPlaced ?? []).length;
      const isMyTurn = round.turnUserId === currentUserId;
      const turnPlayer =
        state.players.find((p) => p.userId === round.turnUserId) ?? null;
      return {
        question: t("relay.instruction"),
        progressNote: t("board.progressPlaced", {
          count: placed,
          total: round.items.length,
        }),
        call: {
          yours: isMyTurn,
          icon: isMyTurn ? (
            <ListOrdered size={15} aria-hidden />
          ) : (
            <ArrowRight size={15} aria-hidden />
          ),
          title: isMyTurn
            ? t("turnIndicator.yourTurn")
            : t("turnIndicator.waitingFor", {
                name: turnPlayer?.username ?? "",
              }),
          hint: isMyTurn ? t("board.noTakebacks") : undefined,
        },
        status: (player) => {
          const active = player.userId === round.turnUserId;
          const acted = placements.some((p) => p.userId === player.userId);
          return {
            label: active
              ? t("board.placingNow")
              : acted
                ? t("board.placed")
                : t("board.waiting"),
            done: acted && !active,
            active,
          };
        },
        // Relay's turn order is fixed for the round, so it is worth showing in
        // full rather than only naming whoever is up: you can see your own
        // placement coming and think about it before it arrives.
        asidePanel: (
          <section
            aria-label={t("relay.turnOrder")}
            className="flex flex-col gap-[11px] rounded-card border border-border bg-surface-card p-[18px]"
          >
            <Text as="h3" className="text-[15px] font-bold">
              {t("relay.turnOrder")}
            </Text>
            <ol className="flex flex-col gap-[7px]">
              {state.players.map((player, i) => {
                const now = player.userId === round.turnUserId;
                return (
                  <li
                    key={player.userId}
                    className={cn(
                      "flex items-center gap-2.5 rounded-control border p-[9px_11px]",
                      now
                        ? "border-acc/35 bg-acc/[0.07]"
                        : "border-border bg-background",
                    )}
                  >
                    <span className="w-3.5 font-mono text-[11.5px] font-bold text-foreground-tertiary">
                      {i + 1}
                    </span>
                    <UserAvatar
                      username={player.username}
                      avatarKey={player.avatarKey}
                      className="h-[26px] w-[26px] flex-none rounded-full bg-surface-raised text-[10px] font-bold text-foreground"
                    />
                    <Text className="truncate text-[12.5px] font-semibold">
                      {player.username}
                    </Text>
                    {now && (
                      <span className="ms-auto flex-none rounded-md bg-acc/[0.16] px-[9px] py-[3px] text-[10.5px] font-bold tracking-[0.04em] text-acc-hover">
                        {t("relay.placingBadge")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ),
      };
    }

    default:
      return null;
  }
}
