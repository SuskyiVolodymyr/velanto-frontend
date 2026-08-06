"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, WifiOff } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { pageContainer } from "@/src/shared/lib/page-container";
import { cn } from "@/src/shared/lib/cn";
import { useFriendsRoom } from "./use-friends-room";
import { useRoomViewerId } from "./use-room-viewer-id";
import { RoomLobby } from "./RoomLobby";
import { RoomRoundBoard } from "./RoomRoundBoard";
import { RoomBetweenBoard } from "./RoomBetweenBoard";
import { GuessingPhaseScreen } from "./GuessingPhaseScreen";
import { RoomResults } from "./RoomResults";
import { IdentityRevealScreen } from "./IdentityRevealScreen";
import { SpyAccusationScreen } from "./SpyAccusationScreen";
import { SpyRevealScreen } from "./SpyRevealScreen";
import { RoomHeader } from "./RoomHeader";
import { RoomKicked } from "./RoomKicked";
import { useExitToPack } from "./use-exit-to-pack";
import { usePlayFocus } from "@/src/shared/lib/play-focus-context";

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
    spyPick,
    accuse,
    submitRanking,
    placeItem,
    ready,
    next,
    lock,
    leave,
    kick,
    setMode,
    guess,
    start,
  } = useFriendsRoom(roomId);
  // The account id, or — for someone who joined with a nickname — the guest
  // the join created. See useRoomViewerId.
  const userId = useRoomViewerId(roomId);

  // A round owns the whole width; the results afterwards are a page you have
  // finished with and want to leave, so the rail comes back for them. Both
  // live at this same url, which is why the shell cannot decide it by path.
  const playing =
    state !== null && state.phase !== "finished" && state.phase !== "abandoned";
  usePlayFocus(playing && !kicked);

  // Claim and Turn-based cut caption themselves "Save" or "Sacrifice" after
  // the PACK's format. It rides the room snapshot (the live room already holds
  // the pack), so this no longer costs a fetch per room; the two modes that
  // read it are the only ones that care.
  const packFormat =
    state?.packFormat === "save_one" || state?.packFormat === "sacrifice_one"
      ? state.packFormat
      : undefined;

  // A finished game shows its results even after the server tears the socket
  // down (teardown closes every socket, which arrives as connection "closed").
  // This must come before the closed check, or the results would flash and be
  // replaced by "this room has ended" the instant the room is evicted.
  if (state?.phase === "finished") {
    return (
      <Shell>
        {state.mode === "guess_who" && state.endgame ? (
          <IdentityRevealScreen state={state} />
        ) : state.mode === "spy" && state.endgame ? (
          <SpyRevealScreen state={state} currentUserId={userId} />
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
    <>
      {/* The pack's title, and the page's h1-equivalent for every live phase —
          the round and survivor headings below are h2s beneath it.

          Same reasoning as PlayHeader on the single-player screens: once a
          round is up, nothing else on the page says WHICH pack you are in. The
          round heading is the round's own name, so someone who joined from a
          shared link had no on-page answer to "what are we playing?".

          Leave sits opposite it — available in the lobby and mid-game alike, and
          it confirms first during a round (see RoomLeaveButton). Both are kept
          out of the finished/ended/abandoned states above, where there is
          nothing left to leave and RoomResults heads itself. */}
      <RoomHeader state={state} onLeave={leave} />
      <Shell>
        {/* The header shows the title visually; this keeps it as the page's
            real (if visually hidden) h1 for the phases that render no heading
            of their own. The lobby does ("Choose how you'll play"), so it is
            skipped there rather than giving the page two h1s. */}
        {state.phase !== "lobby" && (
          <Text as="h1" className="sr-only">
            {state.packTitle}
          </Text>
        )}
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
            onStart={start}
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
              spyPick,
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
        {state.phase === "guessing" &&
          (state.mode === "spy" ? (
            <SpyAccusationScreen
              state={state}
              currentUserId={userId}
              onAccuse={accuse}
            />
          ) : (
            <GuessingPhaseScreen
              state={state}
              currentUserId={userId}
              onSubmit={guess}
            />
          ))}
        {/* phase "finished" is handled above, before the connection checks, so a
          torn-down socket still shows results. */}
      </Shell>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        pageContainer(1320),
        // The mock's 120px bottom gutter clears its own fixed start bar. Ours
        // has to clear that AND the app's mobile bottom nav stacked under it
        // (~72px each), or the last card sits behind them both.
        "flex flex-1 flex-col gap-[22px] pt-[26px] pb-[60px] max-[720px]:pt-[18px] max-[720px]:pb-[168px]",
      )}
    >
      {children}
    </div>
  );
}

function RoomEnded({ packId }: { packId: string | null }) {
  const t = useTranslations("room");
  const router = useRouter();
  useExitToPack(packId);
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Text as="h1" variant="title" className="text-2xl">
        {t("ended.heading")}
      </Text>
      <Text variant="secondary" className="max-w-sm">
        {t("ended.description")}
      </Text>
      {/* The timer above is the floor, not the exit. A terminal screen with no
          control on it reads as a hang — and anyone who looks away and back
          finds a page they have no way to leave. Same escape hatch, and the
          same destination, as RoomKicked's. */}
      <Button onClick={() => router.push(packId ? `/packs/${packId}` : "/")}>
        {t("ended.leave")}
      </Button>
    </div>
  );
}
