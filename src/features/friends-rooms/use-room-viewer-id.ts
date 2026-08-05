"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { getGuestSession } from "./guest-session";

/**
 * Who "you" are in this room — the id the roster, the ready gate and every
 * board compare against to find the viewer's own seat.
 *
 * A signed-in user is their account. A guest is the throwaway user the join
 * created, whose id lives in sessionStorage beside their token; without this
 * they would be a player in the room the screen could not recognise, with no
 * "You" badge, no ready button of their own, and a kick control pointed at
 * themselves.
 *
 * A real session always wins, for the same reason it does on the socket:
 * someone who guested into a room and later signed in holds both, and the
 * account is the one they are actually seated as now.
 *
 * The guest half is read after mount rather than during render: sessionStorage
 * does not exist on the server, and reading it during the first client render
 * would diverge from the server HTML. A guest therefore has one render as
 * "nobody", which is the same state the screen is already in while the socket
 * connects.
 */
export function useRoomViewerId(roomId: string): string | null {
  const { user } = useAuth();
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setGuestId(getGuestSession(roomId)?.guestId ?? null);
  }, [roomId]);

  return user?.id ?? guestId;
}
