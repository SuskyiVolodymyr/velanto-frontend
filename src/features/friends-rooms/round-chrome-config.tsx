"use client";

import { ArrowRight, Eye, Hand, ListOrdered, Lock } from "lucide-react";
import type { useTranslations } from "next-intl";
import type { RoundCall, RoundPlayerStatus } from "./RoundChrome";
import type { RoomPlayerState, RoomState } from "./room-types";

type T = ReturnType<typeof useTranslations>;

export interface RoundChromeConfig {
  question: string;
  progressNote: string;
  call: RoundCall;
  status: (player: RoomPlayerState) => RoundPlayerStatus;
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
          hint: t("board.blindHint"),
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
      };
    }

    default:
      return null;
  }
}
