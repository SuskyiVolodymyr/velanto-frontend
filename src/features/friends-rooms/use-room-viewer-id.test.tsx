import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRoomViewerId } from "./use-room-viewer-id";
import type { User } from "@/src/shared/types/user";

let currentUser: User | null;
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: currentUser }),
}));

function asUser(): User {
  return {
    id: "u1",
    email: null,
    username: "Alice",
    role: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

function seatGuest(roomId: string, guestId: string) {
  sessionStorage.setItem(
    `velanto:room-guest:${roomId}`,
    JSON.stringify({ token: "guest.jwt", guestId, roomId }),
  );
}

describe("useRoomViewerId", () => {
  beforeEach(() => {
    sessionStorage.clear();
    currentUser = null;
  });

  it("is the account id for a signed-in viewer", () => {
    currentUser = asUser();

    const { result } = renderHook(() => useRoomViewerId("room-1"));

    expect(result.current).toBe("u1");
  });

  // Without this a guest is a player the screen cannot recognise: no "You"
  // badge, no ready button of their own, and a kick control pointed at
  // themselves.
  it("is the guest id for someone who joined with a nickname", async () => {
    seatGuest("room-1", "guest-1");

    const { result } = renderHook(() => useRoomViewerId("room-1"));

    await waitFor(() => expect(result.current).toBe("guest-1"));
  });

  // Same rule as the socket's: someone who guested and later signed in holds
  // both, and the account is who they are seated as now.
  it("prefers the account over a leftover guest session", () => {
    currentUser = asUser();
    seatGuest("room-1", "guest-1");

    const { result } = renderHook(() => useRoomViewerId("room-1"));

    expect(result.current).toBe("u1");
  });

  it("ignores a guest session belonging to another room", async () => {
    seatGuest("room-2", "guest-2");

    const { result } = renderHook(() => useRoomViewerId("room-1"));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("is nobody for a signed-out visitor with no guest session", () => {
    const { result } = renderHook(() => useRoomViewerId("room-1"));

    expect(result.current).toBeNull();
  });
});
