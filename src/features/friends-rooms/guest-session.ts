/**
 * The credential an anonymous player holds for the one room they joined.
 *
 * Stored in `sessionStorage`, which is a deliberate departure from the access
 * token's memory-only rule and worth spelling out: a session token is never
 * persisted because it does not need to be — the httpOnly refresh cookie
 * rebuilds it after a reload. A guest has no refresh cookie and no renewal path
 * of any kind, so a reload with the token only in memory would strand them
 * outside a room they are still seated in, with no way back but to join again
 * under a new name. `sessionStorage` is the narrowest store that survives a
 * reload: it dies with the tab, exactly as the guest's game does.
 *
 * Keyed per room, so joining a second room never quietly overwrites the first.
 */
const KEY_PREFIX = "velanto:room-guest:";

export interface GuestSession {
  /** JWT bound to `roomId` by the server; useless anywhere else. */
  token: string;
  /** The guest's own user id, so the room can find itself in the roster. */
  guestId: string;
  roomId: string;
}

function key(roomId: string): string {
  return `${KEY_PREFIX}${roomId}`;
}

export function saveGuestSession(session: GuestSession): void {
  try {
    sessionStorage.setItem(key(session.roomId), JSON.stringify(session));
  } catch {
    // Private mode, a full quota, or storage blocked entirely. The join itself
    // already succeeded and the in-memory token still works for this page, so
    // failing here costs a reload, not the game.
  }
}

/**
 * The guest session for `roomId`, or null. Returns null for anything that
 * isn't a well-formed session, so a corrupted or hand-edited entry degrades to
 * "not a guest" rather than sending a garbage Authorization header.
 */
export function getGuestSession(roomId: string): GuestSession | null {
  try {
    const raw = sessionStorage.getItem(key(roomId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as GuestSession).token !== "string" ||
      typeof (parsed as GuestSession).guestId !== "string"
    ) {
      return null;
    }
    // Trust the key, not the stored field: a session filed under this room is
    // for this room, whatever its payload claims.
    return { ...(parsed as GuestSession), roomId };
  } catch {
    return null;
  }
}

export function clearGuestSession(roomId: string): void {
  try {
    sessionStorage.removeItem(key(roomId));
  } catch {
    // Nothing to do — see saveGuestSession.
  }
}
