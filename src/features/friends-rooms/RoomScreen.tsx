"use client";

import { useTranslations } from "next-intl";
import { Loader2, WifiOff } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { useAuth } from "@/src/shared/lib/auth-context";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { useFriendsRoom } from "./use-friends-room";
import { RoomLobby } from "./RoomLobby";
import { RoomRound } from "./RoomRound";
import { RoomBetween } from "./RoomBetween";
import { RoomResults } from "./RoomResults";
import { RoomLeaveButton } from "./RoomLeaveButton";
import { RoomKicked } from "./RoomKicked";

/**
 * The single entry point for a friends room. Subscribes to the live room over
 * {@link useFriendsRoom} and switches on `state.phase` to render the lobby, the
 * claim board, the between-round survivor, or the final results.
 *
 * Connection is kept distinct from phase: a dropped socket shows a non-blocking
 * "reconnecting…" banner over the last board it had, and a closed socket (or an
 * abandoned room) falls to a plain "this room has ended" state.
 */
export function RoomScreen({ roomId }: { roomId: string }) {
  const t = useTranslations("room");
  const { user } = useAuth();
  const {
    state,
    connection,
    lastRejection,
    kicked,
    claim,
    ready,
    next,
    lock,
    leave,
    kick,
  } = useFriendsRoom(roomId);
  const userId = user?.id ?? null;

  // A finished game shows its results even after the server tears the socket
  // down (teardown closes every socket, which arrives as connection "closed").
  // This must come before the closed check, or the results would flash and be
  // replaced by "this room has ended" the instant the room is evicted.
  if (state?.phase === "finished") {
    return (
      <Shell>
        <RoomResults state={state} />
      </Shell>
    );
  }

  // Being kicked must win over the generic "room ended" state: the server drops
  // the socket right after `player.kicked`, which arrives as connection
  // "closed", so this has to come before the closed check or the removed-by-host
  // message would flash and be replaced by the neutral ended screen.
  if (kicked) {
    return (
      <Shell>
        <RoomKicked />
      </Shell>
    );
  }

  if (connection === "closed") {
    return (
      <Shell>
        <RoomEnded />
      </Shell>
    );
  }

  if (!state) {
    return (
      <Shell>
        <div
          role="status"
          className="flex flex-col items-center gap-3 py-20 text-foreground-secondary"
        >
          <Loader2 size={28} aria-hidden className="animate-spin" />
          <Text variant="secondary">{t("loading")}</Text>
        </div>
      </Shell>
    );
  }

  if (state.phase === "abandoned") {
    return (
      <Shell>
        <RoomEnded />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Leave is available in the lobby and mid-game alike — it confirms first
          during a round (see RoomLeaveButton). Kept out of the finished/ended/
          abandoned states above, where there is nothing left to leave. */}
      <div className="mb-6 flex justify-end">
        <RoomLeaveButton state={state} onLeave={leave} />
      </div>

      {connection === "connecting" && (
        <div
          role="status"
          className="mb-6 flex items-center gap-2 rounded-[10px] border border-border-strong bg-surface px-4 py-2.5"
        >
          <WifiOff
            size={16}
            aria-hidden
            className="text-foreground-secondary"
          />
          <Text variant="secondary" className="text-sm">
            {t("reconnecting")}
          </Text>
        </div>
      )}

      {state.phase === "lobby" && (
        <RoomLobby
          state={state}
          currentUserId={userId}
          onReady={ready}
          onLock={lock}
          onKick={kick}
        />
      )}
      {state.phase === "round" && (
        <RoomRound
          state={state}
          currentUserId={userId}
          lastRejection={lastRejection}
          onClaim={claim}
        />
      )}
      {state.phase === "between" && (
        <RoomBetween state={state} currentUserId={userId} onNext={next} />
      )}
      {/* phase "finished" is handled above, before the connection checks, so a
          torn-down socket still shows results. */}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>{children}</div>;
}

function RoomEnded() {
  const t = useTranslations("room");
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <Text as="h1" variant="title" className="text-2xl">
        {t("ended.heading")}
      </Text>
      <Text variant="secondary" className="max-w-sm">
        {t("ended.description")}
      </Text>
    </div>
  );
}
