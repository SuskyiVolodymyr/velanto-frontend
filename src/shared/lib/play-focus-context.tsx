"use client";

import { createContext, useContext, useEffect } from "react";

/**
 * Lets a page ask the shell to drop its nav rail for as long as it is actually
 * being played.
 *
 * Most focus decisions are a property of the ROUTE, and `AppShell`'s own
 * `isNoRailRoute` handles those. A live room is the exception: playing and
 * reading the results afterwards happen at the same URL (`/rooms/:id`), so
 * there is no path to tell them apart. A round should own the whole width; a
 * results screen is a page you have finished with and want to navigate away
 * from, and taking the rail away there strands you.
 */
export interface PlayFocusState {
  focused: boolean;
  setFocused: (focused: boolean) => void;
}

const PlayFocusContext = createContext<PlayFocusState>({
  focused: false,
  setFocused: () => {},
});

export const PlayFocusProvider = PlayFocusContext.Provider;

/** Read it — AppShell's own use. */
export function usePlayFocusState(): PlayFocusState {
  return useContext(PlayFocusContext);
}

/**
 * Declare, from a page, whether it currently wants the rail gone.
 *
 * Always release on unmount: leaving the room by any route — Back, the pack
 * link, the browser — must not leave the next page railless.
 */
export function usePlayFocus(active: boolean): void {
  const { setFocused } = useContext(PlayFocusContext);
  useEffect(() => {
    setFocused(active);
    return () => setFocused(false);
  }, [active, setFocused]);
}
