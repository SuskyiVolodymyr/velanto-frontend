import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFriendsRoom } from "./use-friends-room";

// A fake socket that records its handlers so the test can drive server events.
const handlers = new Map<string, (payload?: unknown) => void>();
const ioHandlers = new Map<string, (payload?: unknown) => void>();
const fakeSocket = {
  on: (event: string, cb: (payload?: unknown) => void) => {
    handlers.set(event, cb);
    return fakeSocket;
  },
  io: {
    on: (event: string, cb: (payload?: unknown) => void) => {
      ioHandlers.set(event, cb);
    },
  },
  emit: vi.fn(),
  disconnect: vi.fn(),
};

function serverEmit(event: string, payload?: unknown) {
  act(() => handlers.get(event)?.(payload));
}

vi.mock("socket.io-client", () => ({ io: () => fakeSocket }));
vi.mock("@/src/shared/lib/api-client", () => ({
  ensureFreshAccessToken: () => Promise.resolve("token"),
  getAccessToken: () => "token",
}));

beforeEach(() => {
  handlers.clear();
  ioHandlers.clear();
  vi.clearAllMocks();
});

// The socket is created inside a `.then()` on ensureFreshAccessToken, so its
// handlers aren't registered synchronously — wait for the connect handler.
async function connected() {
  const hook = renderHook(() => useFriendsRoom("room-1"));
  await waitFor(() => expect(handlers.has("connect")).toBe(true));
  return hook;
}

describe("useFriendsRoom connection", () => {
  it("starts connecting and opens on connect", async () => {
    const { result } = await connected();
    expect(result.current.connection).toBe("connecting");
    serverEmit("connect");
    expect(result.current.connection).toBe("open");
  });

  // The reported bug: returning to a room that no longer exists. The gateway
  // kicks the handshake, which arrives as reason "io server disconnect", and
  // socket.io does not auto-reconnect that — so the screen must go to "closed",
  // not sit in "connecting" (which renders "loading room" forever).
  it("closes — not reconnects — when the server drops the handshake", async () => {
    const { result } = await connected();
    serverEmit("disconnect", "io server disconnect");
    expect(result.current.connection).toBe("closed");
  });

  it("stays connecting on a transient transport drop", async () => {
    const { result } = await connected();
    serverEmit("connect");
    serverEmit("disconnect", "transport close");
    expect(result.current.connection).toBe("connecting");
  });
});
