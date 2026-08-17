"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Reads a client-only value (localStorage / sessionStorage / anything that
 * doesn't exist during SSR) safely across server render + hydration.
 *
 * The server, and the first client (hydration) render, see `serverValue`; the
 * client then reads `read()`. Unlike the "useState(initial) + useEffect that
 * setStates the real value" idiom, this needs no synchronous set-state-in-effect
 * and produces no hydration mismatch, because React drives the swap through the
 * store snapshot rather than a post-mount re-render we write ourselves.
 *
 * `read` must return a value that is stable by `Object.is` across calls for the
 * same underlying state (a primitive, or a memoized reference) — the same
 * contract `useSyncExternalStore` places on any getSnapshot. Don't use this for
 * values that build a fresh object/array each call.
 */
export function useHydratedValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}
