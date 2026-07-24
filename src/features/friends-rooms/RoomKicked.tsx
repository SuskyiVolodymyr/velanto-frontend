"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { useFriendsRoomsPresenceOrDefault } from "./friends-rooms-presence-context";
import { useExitToPack } from "./use-exit-to-pack";

/**
 * Shown when the host has removed the viewer from the room (the `player.kicked`
 * event). Distinct from the neutral "this room has ended" — it names what
 * happened so the removed player isn't left guessing. The server drops their
 * socket right after, so there is nothing live to return to — so this returns
 * to the PACK, which is where a new room gets started, rather than dumping the
 * player on the home feed. It leaves on its own after a beat too (see
 * RoomScreen's useExitToPack); the button is for anyone who would rather not
 * wait. Presence is refreshed on mount so the floating indicator drops this
 * room right away.
 */
export function RoomKicked({ packId }: { packId: string | null }) {
  const t = useTranslations("room");
  const router = useRouter();
  const { refresh } = useFriendsRoomsPresenceOrDefault();
  useExitToPack(packId);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Text as="h1" variant="title" className="text-2xl">
        {t("kicked.heading")}
      </Text>
      <Text variant="secondary" className="max-w-sm">
        {t("kicked.description")}
      </Text>
      <Button onClick={() => router.push(packId ? `/packs/${packId}` : "/")}>
        {t("kicked.leave")}
      </Button>
    </div>
  );
}
