"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { ConfirmModal } from "@/src/shared/components/ConfirmModal";
import { useFriendsRoomsPresenceOrDefault } from "./friends-rooms-presence-context";
import type { RoomState } from "./room-types";

/**
 * The Leave control, available in the lobby and mid-game. Leaving is an explicit
 * exit: the server removes the seat and broadcasts `player.left { seatKept:
 * false }`, so everyone else's roster drops us (unlike a disconnect, which keeps
 * the seat). The host has no special restriction — if the host leaves the server
 * rotates the role and the remaining players get `host.changed`.
 *
 * A lobby leave goes straight through; a mid-game leave confirms first, because
 * it restarts the round for the others and disrupts a game in progress. After
 * leaving we route to the pack page and refresh presence so the floating
 * indicator drops this room immediately.
 */
export function RoomLeaveButton({
  state,
  onLeave,
}: {
  state: RoomState;
  onLeave: () => void;
}) {
  const t = useTranslations("room");
  const router = useRouter();
  const { refresh } = useFriendsRoomsPresenceOrDefault();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const midGame = state.phase === "round" || state.phase === "between";

  function performLeave() {
    onLeave();
    refresh();
    router.push(`/packs/${state.packId}`);
  }

  function handleClick() {
    if (midGame) {
      setConfirmOpen(true);
    } else {
      performLeave();
    }
  }

  return (
    <>
      {/* Its own element rather than a restyled <Button>: the mock's header
          pill is a distinct geometry (38px, 11px radius, bordered) and cn() is
          a plain join, so overriding Button's would leave both sets of
          utilities fighting. */}
      <button
        type="button"
        onClick={handleClick}
        className="flex h-[38px] flex-none items-center gap-2 rounded-[11px] border border-border-strong bg-surface-card ps-2.5 pe-[13px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:border-white/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
      >
        <LogOut size={16} aria-hidden />
        {t("leave")}
      </button>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={performLeave}
        title={t("leaveConfirm.title")}
        message={t("leaveConfirm.message")}
        confirmLabel={t("leaveConfirm.confirm")}
        cancelLabel={t("leaveConfirm.cancel")}
      />
    </>
  );
}
