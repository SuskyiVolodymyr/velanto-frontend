import { apiClient } from "@/src/shared/lib/api-client";
import type { MyRoomSummary, RoomState } from "./room-types";

/**
 * REST surface for friends rooms. The realtime game runs over the socket (see
 * use-friends-room.ts); these calls only create a room, join one by code, read a
 * snapshot, and list the rooms you currently hold a seat in — the durable,
 * request/response parts.
 */
export const friendsRoomsClient = {
  /** Open a room over a save_one_friends pack. The caller becomes the host. */
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
};
