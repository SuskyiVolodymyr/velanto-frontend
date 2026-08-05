"use client";

import { useState } from "react";
import { ApiError } from "@/src/shared/lib/api-client";
import { friendsRoomsClient } from "./friends-rooms-client";
import { saveGuestSession } from "./guest-session";
import type { RoomState } from "./room-types";

/**
 * Which inline error to show. Shared with the signed-in join so both paths
 * speak the same language for the same server answers, plus the two failures
 * only a guest can hit.
 */
export type GuestJoinErrorKey =
  | "emptyCode"
  | "emptyNickname"
  | "errorNickname"
  | "errorNotFound"
  | "errorUnavailable"
  | "errorRateLimited"
  | "errorGeneric";

export interface GuestJoin {
  joining: boolean;
  error: GuestJoinErrorKey | null;
  clearError: () => void;
  /**
   * Join `code` as `nickname`, persisting the returned token so a reload lands
   * back in the same seat. Resolves to the room on success and to null on any
   * failure, having set {@link GuestJoin.error} — callers navigate on a room
   * and render the error otherwise, so neither has to catch.
   */
  join: (code: string, nickname: string) => Promise<RoomState | null>;
}

/**
 * The anonymous half of joining a room. Used by both entry points (the pack
 * page's inline form and the invite-link landing) so the validation, the error
 * mapping and — the part worth centralising — remembering the token are
 * written once.
 */
export function useGuestJoin(): GuestJoin {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<GuestJoinErrorKey | null>(null);

  async function join(
    code: string,
    nickname: string,
  ): Promise<RoomState | null> {
    // Codes are read aloud off a friend's screen; be forgiving about case and
    // stray spaces here as well as on the server.
    const normalizedCode = code.trim().toUpperCase();
    const trimmedNickname = nickname.trim();
    if (!normalizedCode) {
      setError("emptyCode");
      return null;
    }
    if (!trimmedNickname) {
      setError("emptyNickname");
      return null;
    }

    setError(null);
    setJoining(true);
    try {
      const result = await friendsRoomsClient.joinAsGuest(
        normalizedCode,
        trimmedNickname,
      );
      // Before returning, so the caller can navigate straight into the room and
      // find the token already there.
      saveGuestSession({
        token: result.token,
        guestId: result.guestId,
        roomId: result.room.id,
      });
      return result.room;
    } catch (err) {
      setJoining(false);
      setError(errorKeyFor(err));
      return null;
    }
  }

  return { joining, error, clearError: () => setError(null), join };
}

/**
 * Map a failed join to what the player should be told.
 *
 * Two answers only a guest can get. 400 means the nickname broke the username
 * rules or tripped the slur filter; the server deliberately does not say which
 * — its message is content-free so the blocklist can't be probed — so neither
 * do we. 429 is the 5-joins-per-hour-per-IP limit, which a household sharing an
 * address can reach honestly, so it gets its own message rather than the
 * generic "something went wrong" that would leave them retrying forever.
 */
function errorKeyFor(err: unknown): GuestJoinErrorKey {
  if (!(err instanceof ApiError)) return "errorGeneric";
  if (err.status === 400) return "errorNickname";
  if (err.status === 404) return "errorNotFound";
  // Full, already started, or locked — all 409 from the backend.
  if (err.status === 409) return "errorUnavailable";
  if (err.status === 429) return "errorRateLimited";
  return "errorGeneric";
}
