import type { RoomState } from "./room-types";

/** A small shared RoomState builder for this feature's tests, replacing each
 * file's own ad hoc inline fixture. */
export function baseRoomState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    id: "room-1",
    code: "ABC123",
    packId: "pack-1",
    packTitle: "Test Pack",
    hostId: "u1",
    status: "playing",
    phase: "round",
    locked: false,
    mode: "claim",
    availableModes: [{ mode: "claim", available: true, maxPlayers: 4 }],
    maxPlayers: 4,
    totalRounds: 3,
    roundIndex: 0,
    autoNextAt: null,
    players: [
      {
        userId: "u1",
        username: "Alice",
        avatarKey: null,
        seat: 0,
        connected: true,
        ready: true,
        next: false,
        claimedItemId: null,
      },
      {
        userId: "u2",
        username: "Bob",
        avatarKey: null,
        seat: 1,
        connected: true,
        ready: true,
        next: false,
        claimedItemId: null,
      },
    ],
    round: null,
    results: [],
    guessing: null,
    endgame: null,
    myGuess: null,
    ...overrides,
  };
}
