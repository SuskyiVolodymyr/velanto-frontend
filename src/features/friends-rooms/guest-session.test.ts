import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGuestSession,
  getGuestSession,
  saveGuestSession,
} from "./guest-session";

const SESSION = { token: "guest.jwt", guestId: "guest-1", roomId: "room-1" };

describe("guest-session", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("round-trips a session for its room", () => {
    saveGuestSession(SESSION);

    expect(getGuestSession("room-1")).toEqual(SESSION);
  });

  // Keyed per room so joining a second room never quietly overwrites the first.
  it("keeps each room's session separate", () => {
    saveGuestSession(SESSION);
    saveGuestSession({ token: "b.jwt", guestId: "guest-2", roomId: "room-2" });

    expect(getGuestSession("room-1")?.token).toBe("guest.jwt");
    expect(getGuestSession("room-2")?.token).toBe("b.jwt");
  });

  it("returns null for a room with no session", () => {
    expect(getGuestSession("room-1")).toBeNull();
  });

  it("clears one room's session and leaves the rest", () => {
    saveGuestSession(SESSION);
    saveGuestSession({ token: "b.jwt", guestId: "guest-2", roomId: "room-2" });

    clearGuestSession("room-1");

    expect(getGuestSession("room-1")).toBeNull();
    expect(getGuestSession("room-2")).not.toBeNull();
  });

  // A garbage entry must degrade to "not a guest" rather than send a broken
  // Authorization header the server would 401 on.
  it.each([
    ["not JSON at all", "}{"],
    ["a JSON scalar", '"nope"'],
    ["an object with no token", '{"guestId":"g"}'],
    ["a token of the wrong type", '{"token":1,"guestId":"g"}'],
  ])("returns null for %s", (_label, raw) => {
    sessionStorage.setItem("velanto:room-guest:room-1", raw);

    expect(getGuestSession("room-1")).toBeNull();
  });

  // The key is the authority on which room this is for; a payload claiming
  // otherwise must not be able to redirect the token.
  it("trusts the key over a mismatched roomId in the payload", () => {
    sessionStorage.setItem(
      "velanto:room-guest:room-1",
      JSON.stringify({ token: "t", guestId: "g", roomId: "room-9" }),
    );

    expect(getGuestSession("room-1")?.roomId).toBe("room-1");
  });

  // Private mode and blocked storage throw on access. The join already
  // succeeded by then, so this must cost a reload, not the game.
  it("survives storage throwing on write and on read", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveGuestSession(SESSION)).not.toThrow();

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getGuestSession("room-1")).toBeNull();
  });
});
