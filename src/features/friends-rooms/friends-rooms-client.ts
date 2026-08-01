import { apiClient } from "@/src/shared/lib/api-client";
import type { Group, PackFormat, Round } from "@/src/shared/types/pack";
import type { AvailableMode, MyRoomSummary, RoomState } from "./room-types";

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

  /** A snapshot for a member — the initial load before the socket connects. */
  getById: (id: string) => apiClient.get<RoomState>(`/friends-rooms/${id}`),

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
  ) =>
    apiClient.post<AvailableMode[]>("/packs/modes/preview", draft, options),
};
