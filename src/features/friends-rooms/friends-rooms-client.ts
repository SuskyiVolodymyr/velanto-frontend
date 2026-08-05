import { apiClient, getAccessToken } from "@/src/shared/lib/api-client";
import type { Group, PackFormat, Round } from "@/src/shared/types/pack";
import { getGuestSession } from "./guest-session";
import type {
  AvailableMode,
  GuestJoinResult,
  MyRoomSummary,
  RoomState,
} from "./room-types";

/**
 * REST surface for friends rooms. The realtime game runs over the socket (see
 * use-friends-room.ts); these calls only create a room, join one by code, read a
 * snapshot, and list the rooms you currently hold a seat in — the durable,
 * request/response parts.
 */
export const friendsRoomsClient = {
  /**
   * Open a room over a pack. The caller becomes the host.
   *
   * Rooms are DORMANT while the universal room/mode model is rebuilt (#276):
   * the backend responds 503 to this call for now. Kept as the room infra that
   * the redesign will revive. See docs/multiplayer-modes-redesign.md.
   */
  create: (packId: string) =>
    apiClient.post<RoomState>("/friends-rooms", { packId }),

  /** Join by the host's code. Returns the caller's own seat if already in. */
  join: (code: string) =>
    apiClient.post<RoomState>("/friends-rooms/join", { code }),

  /**
   * Join without an account: a code and a nickname, in exchange for a token
   * good for that one room and nothing else.
   *
   * Unauthenticated — the response is what creates the caller. The token it
   * returns is NOT a session: there is no refresh behind it, so when it expires
   * (12h) the guest re-joins as a new one. Store it with saveGuestSession.
   */
  joinAsGuest: (code: string, nickname: string) =>
    apiClient.post<GuestJoinResult>("/friends-rooms/join-guest", {
      code,
      nickname,
    }),

  /**
   * A snapshot for a member — the initial load before the socket connects.
   *
   * A guest presents their room token explicitly, because they have no ambient
   * identity — the api-client's Authorization header comes from the in-memory
   * access token, which a signed-out guest does not have.
   *
   * A real session always wins. Someone who guested into a room and later
   * signed in still has that guest entry in sessionStorage, and sending it
   * would hand them the throwaway seat instead of their own.
   */
  getById: (id: string) => {
    const guest = getAccessToken() === null ? getGuestSession(id) : null;
    return apiClient.get<RoomState>(`/friends-rooms/${id}`, {
      headers: guest ? { Authorization: `Bearer ${guest.token}` } : undefined,
    });
  },

  /**
   * The rooms the signed-in user still holds a seat in, including ones they have
   * navigated away from (membership ends only on an explicit Leave). Backs the
   * persistent presence indicator.
   */
  mine: () => apiClient.get<MyRoomSummary[]>("/friends-rooms/mine"),

  /**
   * Every mode a pack's format offers, with that pack's feasibility folded in —
   * the pack detail page's mode preview, callable with no room yet. Public
   * (mirrors GET /packs/:id's own visibility), so no auth is required, but the
   * client-side pack-fallback path calls it authenticated same as everything
   * else there. Backed by PackModesController in the friends-rooms module.
   */
  availableModes: (packId: string) =>
    apiClient.get<AvailableMode[]>(`/packs/${packId}/modes`),

  /**
   * The Create/Edit Pack form's live "Friend modes unlocked" preview — same
   * feasibility rules as availableModes, run against an unsaved draft (no
   * packId yet). Auth-required (mirrors POST /packs itself), unlike the
   * public GET above. `signal` lets a caller cancel a superseded in-flight
   * request when the draft changes again before this one resolves.
   */
  previewModes: (
    draft: { format: PackFormat; groups: Group[]; rounds: Round[] },
    options?: { signal?: AbortSignal },
  ) => apiClient.post<AvailableMode[]>("/packs/modes/preview", draft, options),
};
