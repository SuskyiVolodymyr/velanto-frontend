"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { useFriendsRoomsPresenceOrDefault } from "./friends-rooms-presence-context";

/**
 * Shown when the host has removed the viewer from the room (the `player.kicked`
 * event). Distinct from the neutral "this room has ended" — it names what
 * happened so the removed player isn't left guessing. The server drops their
 * socket right after, so there is nothing live to return to; the only action is
 * to leave for the home feed. Presence is refreshed on mount so the floating
 * indicator drops this room right away.
 */
export function RoomKicked() {
  const t = useTranslations("room");
  const router = useRouter();
  const { refresh } = useFriendsRoomsPresenceOrDefault();

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
      <Button onClick={() => router.push("/")}>{t("kicked.leave")}</Button>
    </div>
  );
}
