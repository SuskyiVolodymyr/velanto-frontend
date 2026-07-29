"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, WifiOff } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { useAuth } from "@/src/shared/lib/auth-context";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { Pack } from "@/src/shared/types/pack";
import { useFriendsRoom } from "./use-friends-room";
import { RoomLobby } from "./RoomLobby";
import { RoomRoundBoard } from "./RoomRoundBoard";
import { RoomBetweenBoard } from "./RoomBetweenBoard";
import { GuessingPhaseScreen } from "./GuessingPhaseScreen";
import { RoomResults } from "./RoomResults";
import { IdentityRevealScreen } from "./IdentityRevealScreen";
import { RoomLeaveButton } from "./RoomLeaveButton";
import { RoomKicked } from "./RoomKicked";
import { useExitToPack } from "./use-exit-to-pack";

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
    lastModeRejection,
    modeRejectionSeq,
    kicked,
    claim,
    cut,
    pick,
    vote,
    submitRanking,
    placeItem,
    ready,
    next,
    lock,
    leave,
    kick,
    setMode,
    guess,
  } = useFriendsRoom(roomId);
  const userId = user?.id ?? null;

  // Claim's save/sacrifice copy needs the pack's format, which isn't on the
  // room's own wire state (RoomState carries no format field — see the
  // rooms-UI plan's Task 9 note). Best-effort: a failed fetch just keeps the
  // "sacrifice_one" fallback every Claim board already defaults to.
  const [packFormat, setPackFormat] = useState<
    Extract<Pack["format"], "save_one" | "sacrifice_one"> | undefined
  >(undefined);
  useEffect(() => {
    // Only Claim and Turn-based cut read `packFormat` at all, so there is no
    // reason to fetch for the four modes that ignore it.
    const mode = state?.mode;
    if (!state?.packId || (mode !== "claim" && mode !== "turn_based_cut")) {
      return;
    }
    // Cancellation guard: without it a resolve arriving after the packId
    // changed (or after unmount) would write a stale format over a newer one.
    let cancelled = false;
    packsClient
      .getById(state.packId)
      .then((pack) => {
        if (cancelled) return;
        if (pack.format === "save_one" || pack.format === "sacrifice_one") {
          setPackFormat(pack.format);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [state?.packId, state?.mode]);

  // A finished game shows its results even after the server tears the socket
  // down (teardown closes every socket, which arrives as connection "closed").
  // This must come before the closed check, or the results would flash and be
  // replaced by "this room has ended" the instant the room is evicted.
  if (state?.phase === "finished") {
    return (
      <Shell>
        {state.mode === "guess_who" && state.endgame ? (
          <IdentityRevealScreen state={state} />
        ) : (
          <RoomResults state={state} packFormat={packFormat} />
        )}
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
        <RoomKicked packId={state?.packId ?? null} />
      </Shell>
    );
  }

  if (connection === "closed") {
    return (
      <Shell>
        <RoomEnded packId={state?.packId ?? null} />
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
        <RoomEnded packId={state.packId} />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* The pack's title, and the page's h1 for every live phase — the round
          and survivor headings below are h2s beneath it.

          Same reasoning as PlayHeader on the single-player screens: once a
          round is up, nothing else on the page says WHICH pack you are in. The
          round heading is the round's own name, so someone who joined from a
          shared link had no on-page answer to "what are we playing?".

          Leave sits opposite it — available in the lobby and mid-game alike, and
          it confirms first during a round (see RoomLeaveButton). Both are kept
          out of the finished/ended/abandoned states above, where there is
          nothing left to leave and RoomResults heads itself. */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Text
          as="h1"
          variant="title"
          // min-w-0 is what lets truncate work in a flex row: without it the
          // item's automatic minimum size is its content, so a long title
          // widens the row and pushes Leave off instead of clipping.
          className="min-w-0 truncate text-xl sm:text-2xl"
        >
          {state.packTitle}
        </Text>
        <div className="flex-none">
          <RoomLeaveButton state={state} onLeave={leave} />
        </div>
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
          onSetMode={setMode}
        />
      )}
      {state.phase === "round" && (
        <RoomRoundBoard
          state={state}
          currentUserId={userId}
          packFormat={packFormat}
          actions={{
            claim,
            cut,
            pick,
            vote,
            submitRanking,
            placeItem,
            lastRejection,
            lastModeRejection,
            modeRejectionSeq,
          }}
        />
      )}
      {state.phase === "between" && (
        <RoomBetweenBoard
          state={state}
          currentUserId={userId}
          packFormat={packFormat}
          onNext={next}
        />
      )}
      {state.phase === "guessing" && (
        <GuessingPhaseScreen state={state} onSubmit={guess} />
      )}
      {/* phase "finished" is handled above, before the connection checks, so a
          torn-down socket still shows results. */}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>{children}</div>;
}

function RoomEnded({ packId }: { packId: string | null }) {
  const t = useTranslations("room");
  useExitToPack(packId);
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
