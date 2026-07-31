"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { ConfirmModal } from "@/src/shared/components/ConfirmModal";
import {
  MIN_PLAYERS,
  ROOM_MODE_BOUNDS,
  type RoomMode,
  type RoomPlayerState,
  type RoomState,
} from "./room-types";
import { MODE_NAME_KEY } from "./room-mode-copy";
import { ModePicker } from "./ModePicker";
import { ModeHowItWorks } from "./ModeHowItWorks";
import { RoomRosterPanel } from "./RoomRosterPanel";
import { RoomInvitePanel } from "./RoomInvitePanel";
import { RoomStartPanel } from "./RoomStartPanel";

interface RoomLobbyProps {
  state: RoomState;
  currentUserId: string | null;
  onReady: () => void;
  onStart: () => void;
  onLock: (locked: boolean) => void;
  /** Host-only: remove another player from the room. */
  onKick: (userId: string) => void;
  /** Host-only: change the room's mode. */
  onSetMode: (mode: RoomMode) => void;
}

/**
 * The pre-game lobby (Room Lobby.dc.html): pick the game on the left, manage
 * the room on the right.
 *
 * Readiness is consent, not the trigger — the host presses Start (see the
 * backend's `startGame`), so this screen's job is to make it obvious what the
 * room is still waiting on and who is holding it up.
 */
export function RoomLobby({
  state,
  currentUserId,
  onReady,
  onStart,
  onLock,
  onKick,
  onSetMode,
}: RoomLobbyProps) {
  const t = useTranslations("room");
  const isHost = currentUserId === state.hostId;
  const me = state.players.find((p) => p.userId === currentUserId) ?? null;

  // The player the host is about to kick, pending confirmation. Null = no
  // dialog. Host-only and, for now, lobby-only — the button isn't rendered
  // mid-game even though the server permits it, to keep the in-round UI simple.
  const [kickTarget, setKickTarget] = useState<RoomPlayerState | null>(null);

  const present = state.players.filter((p) => p.connected);
  // Once a mode is chosen, ITS minimum is the one the server gates the start on
  // — MIN_PLAYERS is only the fallback for a room whose mode is still null.
  const minPlayers = state.mode
    ? ROOM_MODE_BOUNDS[state.mode].minPlayers
    : MIN_PLAYERS;

  return (
    <div className="grid items-start gap-[18px] min-[1080px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      {/* On one column the aside leads: what the room is waiting on, and your
          own Ready, matter more than browsing the mode you may not even pick. */}
      <section className="flex flex-col gap-4 max-[1079px]:order-2">
        <div className="flex flex-wrap items-end justify-between gap-2.5">
          <div className="flex flex-col gap-1">
            <Text as="h1" variant="title" className="text-[22px]">
              {t("lobby.chooseHeading")}
            </Text>
            <Text variant="secondary" className="text-[13px]">
              {isHost ? t("lobby.hostHint") : t("lobby.guestHint")}
            </Text>
          </div>
          <span className="rounded-full bg-acc/[0.14] px-[11px] py-[5px] text-[11.5px] font-bold tracking-[0.05em] text-acc-hover">
            {isHost ? t("lobby.roleHost") : t("lobby.roleGuest")}
          </span>
        </div>

        <ModePicker
          availableModes={state.availableModes}
          selectedMode={state.mode}
          isHost={isHost}
          onChange={onSetMode}
        />

        <ModeHowItWorks mode={state.mode} />
      </section>

      <aside className="flex flex-col gap-3.5 max-[1079px]:order-1">
        <RoomRosterPanel
          players={state.players}
          currentUserId={currentUserId}
          hostId={state.hostId}
          maxPlayers={state.maxPlayers}
          minPlayers={minPlayers}
          canKick={isHost}
          onKick={setKickTarget}
        />

        {/* Host-only, as the room lock inside it is: a guest has nothing to
            invite with and nothing to lock. */}
        {isHost && (
          <RoomInvitePanel
            code={state.code}
            locked={state.locked}
            onLock={onLock}
          />
        )}

        <RoomStartPanel
          state={{
            isHost,
            ready: present.filter((p) => p.ready).length,
            total: present.length,
            meReady: me?.ready ?? false,
            modeName: state.mode ? t(MODE_NAME_KEY[state.mode]) : null,
            minPlayers,
          }}
          onStart={onStart}
          onToggleReady={onReady}
        />
      </aside>

      <ConfirmModal
        open={kickTarget !== null}
        onClose={() => setKickTarget(null)}
        onConfirm={() => {
          if (kickTarget) onKick(kickTarget.userId);
          setKickTarget(null);
        }}
        title={t("kick.title")}
        message={t("kick.message", { name: kickTarget?.username ?? "" })}
        confirmLabel={t("kick.confirm")}
        cancelLabel={t("kick.cancel")}
      />
    </div>
  );
}
