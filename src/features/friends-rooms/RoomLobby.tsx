"use client";

import { useTranslations } from "next-intl";
import { Check, Lock, LockOpen, UserPlus } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Username } from "@/src/shared/components/Username";
import { cn } from "@/src/shared/lib/cn";
import { MIN_PLAYERS, type RoomPlayerState, type RoomState } from "./room-types";
import { JoinCode } from "./JoinCode";

interface RoomLobbyProps {
  state: RoomState;
  currentUserId: string | null;
  onReady: () => void;
  onLock: (locked: boolean) => void;
}

/**
 * The pre-game lobby: the roster of seats, a Ready toggle for the viewer, and a
 * host-only bar (stream-safe join code + Lock room). There is no Start button —
 * the server starts the game once every present player is ready and there are at
 * least MIN_PLAYERS, so this only ever tells you what it's still waiting on.
 */
export function RoomLobby({
  state,
  currentUserId,
  onReady,
  onLock,
}: RoomLobbyProps) {
  const t = useTranslations("room");
  const isHost = currentUserId === state.hostId;
  const me = state.players.find((p) => p.userId === currentUserId) ?? null;

  const present = state.players.filter((p) => p.connected);
  const missing = Math.max(0, MIN_PLAYERS - present.length);
  const allReady = present.length > 0 && present.every((p) => p.ready);

  const waiting =
    missing > 0
      ? t("lobby.waitingForPlayers", { count: missing })
      : allReady
        ? t("lobby.starting")
        : t("lobby.waitingForReady");

  // Fill remaining chairs up to the room's capacity with empty seats.
  const emptySeats = Math.max(0, state.maxPlayers - state.players.length);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("lobby.heading")}
        </Text>
        <Text as="h1" variant="title" className="text-2xl">
          {state.packTitle}
        </Text>
      </header>

      <section aria-label={t("lobby.roster")} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {state.players.map((player) => (
            <SeatCard
              key={player.userId}
              player={player}
              isHost={player.userId === state.hostId}
              isYou={player.userId === currentUserId}
            />
          ))}
          {Array.from({ length: emptySeats }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4"
            >
              <span className="h-10 w-10 flex-none rounded-full border border-dashed border-border-strong" />
              <Text variant="tertiary" className="text-sm">
                {t("lobby.emptySeat")}
              </Text>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="secondary" aria-live="polite">
          {waiting}
        </Text>
        <Button
          variant={me?.ready ? "secondary" : "primary"}
          aria-pressed={me?.ready ?? false}
          onClick={onReady}
        >
          {me?.ready ? (
            <>
              <Check size={16} aria-hidden />
              {t("lobby.readyCancel")}
            </>
          ) : (
            t("lobby.readyUp")
          )}
        </Button>
      </div>

      {isHost && (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <UserPlus size={16} aria-hidden className="text-foreground-secondary" />
            <Text variant="title" className="text-sm">
              {t("lobby.inviteHeading")}
            </Text>
          </div>

          {state.code ? (
            <JoinCode code={state.code} />
          ) : (
            <Text variant="tertiary" className="text-xs">
              {t("lobby.codeUnavailable")}
            </Text>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <Text variant="secondary" className="text-sm">
              {state.locked ? t("lobby.lockedNote") : t("lobby.unlockedNote")}
            </Text>
            <Button
              variant={state.locked ? "primary" : "secondary"}
              aria-pressed={state.locked}
              onClick={() => onLock(!state.locked)}
            >
              {state.locked ? (
                <>
                  <Lock size={16} aria-hidden />
                  {t("lobby.unlock")}
                </>
              ) : (
                <>
                  <LockOpen size={16} aria-hidden />
                  {t("lobby.lock")}
                </>
              )}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function SeatCard({
  player,
  isHost,
  isYou,
}: {
  player: RoomPlayerState;
  isHost: boolean;
  isYou: boolean;
}) {
  const t = useTranslations("room");
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-4",
        player.connected ? "border-border bg-surface" : "border-border bg-surface/40",
      )}
    >
      <div className="relative flex-none">
        <UserAvatar
          username={player.username}
          avatarKey={player.avatarKey}
          className="h-10 w-10 rounded-full border border-border bg-background text-sm text-foreground-secondary"
        />
        <span
          aria-hidden
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface",
            player.connected ? "bg-success" : "bg-foreground-tertiary",
          )}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Username username={player.username} />
          {isYou && <Badge variant="accent">{t("lobby.you")}</Badge>}
          {isHost && <Badge>{t("lobby.host")}</Badge>}
        </div>
        <Text
          variant={
            !player.connected ? "tertiary" : player.ready ? "body" : "secondary"
          }
          className={cn(
            "text-xs",
            player.connected && player.ready && "text-success",
          )}
        >
          {!player.connected
            ? t("lobby.away")
            : player.ready
              ? t("lobby.ready")
              : t("lobby.notReady")}
        </Text>
      </div>
    </div>
  );
}
