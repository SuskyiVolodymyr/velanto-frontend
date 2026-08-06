"use client";

import { useTranslations } from "next-intl";
import { EyeOff } from "lucide-react";
import { STICKY_HEADER_SHELL_CLASS } from "@/src/shared/lib/sticky-header-shell";
import { CoverImage } from "@/src/shared/components/CoverImage";
import { cn } from "@/src/shared/lib/cn";
import { RoomLeaveButton } from "./RoomLeaveButton";
import type { RoomState } from "./room-types";

/**
 * The tone a room snapshot from a pre-cover backend falls back to — the exact
 * gradient this header hardcoded before covers rode the snapshot, so an
 * unupgraded gateway looks the way it always did rather than broken.
 */
const FALLBACK_TONE = "#2b2a3a";

/**
 * The room's own sticky header (Room Lobby.dc.html / Room Round.dc.html): Leave,
 * the pack you're playing, and a live pill saying what the room is doing.
 *
 * Not {@link PageHeader}: its left control is a link and its crumb is one line,
 * where this needs an action (Leave confirms mid-game) and a two-line pack
 * caption. It shares the sticky shell class so the chrome still lines up with
 * every other page.
 *
 * The caption is the one thing on screen that says WHICH pack this is once a
 * round is up — someone who joined from a shared link has no other answer to
 * "what are we playing?".
 */
export function RoomHeader({
  state,
  onLeave,
}: {
  state: RoomState;
  onLeave: () => void;
}) {
  const t = useTranslations("room");
  const tFormat = useTranslations("formats");

  const meta = [
    tFormat(state.packFormat),
    t("header.rounds", { count: state.packRounds }),
    state.packAuthorUsername ? `@${state.packAuthorUsername}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const live = PHASE_PILL[state.phase];

  return (
    <header className={cn(STICKY_HEADER_SHELL_CLASS, "gap-3.5")}>
      <RoomLeaveButton state={state} onLeave={onLeave} />

      <div className="flex min-w-0 items-center gap-[11px]">
        {/* The pack's real cover, not a placeholder: this thumbnail plus the
            title is the whole answer to "what are we playing?" for someone who
            arrived from a shared link. `relative` positions CoverImage, which
            fills it and unmounts itself on a load error so the tone gradient
            underneath shows through. */}
        <span
          aria-hidden
          className="relative h-9 w-9 flex-none overflow-hidden rounded-[10px]"
          style={{
            background: `linear-gradient(150deg, ${state.packCoverTone || FALLBACK_TONE}, #0b0c0f)`,
          }}
        >
          {state.packCoverImageKey && (
            <CoverImage coverKey={state.packCoverImageKey} />
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[14.5px] font-semibold text-foreground">
              {state.packTitle}
            </span>
            {/* Only ever rendered for the spy, and only because the server told
                THIS viewer they are one — `iAmSpy` is per-caller and null for
                everyone else, so there is nothing here to read off a shared
                screen. It sits by the title because the role has to be
                unmissable from any phase, not just the board that explains it. */}
            {state.iAmSpy === true && (
              <span className="inline-flex flex-none items-center gap-1 rounded-chip bg-spy/[0.16] px-2 py-0.5 text-[10.5px] font-bold tracking-[0.04em] text-spy">
                <EyeOff size={10} aria-hidden />
                {t("spy.badge")}
              </span>
            )}
          </span>
          {/* Hidden on phones, where the title alone has to fit beside two
              controls — the mock drops it at the same breakpoint. */}
          <span className="truncate text-[11.5px] text-foreground-tertiary max-[720px]:hidden">
            {meta}
          </span>
        </div>
      </div>

      {live && (
        <span
          className={cn(
            "ms-auto flex flex-none items-center gap-[7px] rounded-full px-3 py-1.5 text-xs font-semibold",
            live.tone,
          )}
        >
          <span className="relative flex h-[7px] w-[7px] flex-none">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
            <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-current" />
          </span>
          {t(live.key)}
        </span>
      )}
    </header>
  );
}

/**
 * What the pill says per phase. `finished`/`abandoned` are absent on purpose:
 * those screens head themselves and there is nothing live left to announce.
 */
const PHASE_PILL: Partial<
  Record<RoomState["phase"], { key: string; tone: string }>
> = {
  lobby: { key: "lobby.open", tone: "bg-live/10 text-live" },
  round: { key: "header.inRound", tone: "bg-acc/[0.12] text-acc-hover" },
  between: { key: "header.between", tone: "bg-acc/[0.12] text-acc-hover" },
  guessing: { key: "header.guessing", tone: "bg-score/[0.12] text-score" },
};
