import { apiClient } from "@/src/shared/lib/api-client";
import type { RoomState } from "./room-types";

/**
 * REST surface for friends rooms. The realtime game runs over the socket (see
 * use-friends-room.ts); these three calls only create a room, join one by code,
 * and read a snapshot — the durable, request/response parts.
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
};
