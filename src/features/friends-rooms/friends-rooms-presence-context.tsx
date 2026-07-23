"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { friendsRoomsClient } from "./friends-rooms-client";
import type { MyRoomSummary } from "./room-types";

export interface FriendsRoomsPresenceValue {
  /** The rooms the signed-in user currently holds a seat in. Empty when signed
   *  out or when they hold no seats. */
  rooms: MyRoomSummary[];
  /** Re-fetch the list. The room screen calls this after create/join/leave so
   *  the indicator reflects the change without waiting for the next focus. */
  refresh: () => void;
}

const FriendsRoomsPresenceContext =
  createContext<FriendsRoomsPresenceValue | null>(null);

/**
 * Tracks which friends rooms the signed-in user is still a member of, so the
 * app can offer a persistent way back after they navigate away (a room seat is
 * held until an explicit Leave). Fetches `friendsRoomsClient.mine()` on mount,
 * whenever auth settles to a signed-in user, and on window `focus` (so tabbing
 * back in picks up a room joined or left elsewhere). Signed-out users hold no
 * seats, so it simply keeps an empty list and makes no request.
 *
 * Mounted once, globally, in the root layout alongside the other client
 * providers — a friends room can be re-entered from anywhere, so this cannot
 * live inside the room feature's own subtree.
 */
export function FriendsRoomsPresenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  // The fetched list tagged with the user it belongs to, so a stale fetch from a
  // previous session is never shown after an account switch. State is only ever
  // written asynchronously (in the fetch's `.then`); the signed-out / empty case
  // is derived below rather than written, keeping the effects free of synchronous
  // setState.
  const [entry, setEntry] = useState<{
    userId: string;
    rooms: MyRoomSummary[];
  } | null>(null);

  const refresh = useCallback(() => {
    if (!user) return;
    const userId = user.id;
    friendsRoomsClient
      .mine()
      .then((rooms) => setEntry({ userId, rooms }))
      // Presence is a convenience; a failed poll just leaves the last list up
      // rather than surfacing an error over the whole app.
      .catch(() => undefined);
  }, [user]);

  // Fetch when signed in and whenever the session changes (refresh closes over
  // the current user). Signed out, refresh is a no-op and the derived list below
  // is empty.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-check on tab focus — the roster may have changed while the tab slept.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, refresh]);

  const rooms = user && entry?.userId === user.id ? entry.rooms : [];

  const value = useMemo<FriendsRoomsPresenceValue>(
    () => ({ rooms, refresh }),
    [rooms, refresh],
  );

  return (
    <FriendsRoomsPresenceContext.Provider value={value}>
      {children}
    </FriendsRoomsPresenceContext.Provider>
  );
}

export function useFriendsRoomsPresence(): FriendsRoomsPresenceValue {
  const ctx = useContext(FriendsRoomsPresenceContext);
  if (!ctx)
    throw new Error(
      "useFriendsRoomsPresence must be used within a FriendsRoomsPresenceProvider",
    );
  return ctx;
}

const NOOP_PRESENCE: FriendsRoomsPresenceValue = {
  rooms: [],
  refresh: () => {},
};

/**
 * Like {@link useFriendsRoomsPresence} but tolerates the absence of a provider,
 * returning a no-op value instead of throwing. The room screen uses this so its
 * post-leave `refresh()` is harmless in an isolated component test that hasn't
 * mounted the global provider — the real app always has it in the root layout.
 */
export function useFriendsRoomsPresenceOrDefault(): FriendsRoomsPresenceValue {
  return useContext(FriendsRoomsPresenceContext) ?? NOOP_PRESENCE;
}
