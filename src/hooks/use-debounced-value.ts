import { useEffect, useState } from "react";

/**
 * The value, republished only once it has stopped changing for `delayMs`.
 *
 * Every search and filter box in the app was hand-rolling this: its own
 * `const X_DEBOUNCE_MS = 300`, its own `useEffect` + `setTimeout` +
 * `clearTimeout`, its own second piece of state to hold the published term.
 *
 * The first render publishes immediately (`debounced === value`), so a box that
 * starts populated does not spend `delayMs` reporting an empty term.
 *
 * ⚠️ Setting state from a timeout is not the render-phase cascade the
 * `react-hooks/set-state-in-effect` rule targets, so no suppression is needed
 * here — the same note the call sites used to carry individually.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

/** The interval every search and filter box in the app settled on. */
export const SEARCH_DEBOUNCE_MS = 300;
