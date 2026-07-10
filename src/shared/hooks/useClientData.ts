"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type DependencyList,
  type Dispatch,
  type SetStateAction,
} from "react";

export interface UseClientDataOptions {
  /**
   * When false, the fetcher is not called and the hook stays in a non-loading,
   * data-less state. Flip to true to trigger a fetch — used for gated fetches
   * such as "only when a drawer is open" or "only for an authorized viewer".
   * Defaults to true.
   */
  enabled?: boolean;
}

export interface UseClientDataResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  /** Re-runs the fetcher, aborting any request currently in flight. */
  refetch: () => void;
  /**
   * Escape hatch for optimistic updates and pagination appends: mutate the
   * cached data locally without triggering a refetch (e.g. removing a row after
   * a successful delete, or appending the next page). A subsequent refetch/dep
   * change overwrites whatever was set here.
   */
  setData: Dispatch<SetStateAction<T | null>>;
}

interface State<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

type Action<T> =
  | { type: "load" }
  | { type: "resolve"; data: T }
  | { type: "reject"; error: Error }
  | { type: "disable" }
  | { type: "patch"; updater: SetStateAction<T | null> };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "load":
      // Keep the previous data around (consumers render the loading branch
      // first, so stale data is never shown), just flip the flags.
      return { data: state.data, error: null, loading: true };
    case "resolve":
      return { data: action.data, error: null, loading: false };
    case "reject":
      return { data: state.data, error: action.error, loading: false };
    case "disable":
      return { ...state, loading: false };
    case "patch": {
      const next =
        typeof action.updater === "function"
          ? (action.updater as (prev: T | null) => T | null)(state.data)
          : action.updater;
      return { ...state, data: next };
    }
  }
}

/**
 * Generic client-fetch hook: runs `fetcher` on mount and whenever `deps`
 * change, exposing `{ data, error, loading, refetch, setData }`.
 *
 * The in-flight request is aborted (via an AbortController whose signal is
 * handed to the fetcher) on unmount and on every dep change / refetch, and its
 * late result is ignored. That removes the "setState after unmount / on a stale
 * request" race that made the fetch-on-mount screens flaky under test.
 *
 * State transitions go through a reducer rather than bare setState calls so the
 * synchronous `load`/`disable` dispatch in the effect below is a state-machine
 * event, not the cascading `setState`-in-effect pattern the eslint rule guards
 * against.
 */
export function useClientData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options: UseClientDataOptions = {},
): UseClientDataResult<T> {
  const enabled = options.enabled ?? true;

  const [state, dispatch] = useReducer(reducer<T>, undefined, () => ({
    data: null,
    error: null,
    loading: enabled,
  }));

  // Keep the latest fetcher without making it a dep — callers pass inline
  // closures, so depending on it would refetch on every render. Assigned in an
  // effect (declared before the fetch effect so it runs first each commit)
  // rather than during render, which the react-hooks/refs rule forbids.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // Bumped by refetch() to force the effect to re-run on demand.
  const [refetchNonce, forceRefetch] = useReducer((n: number) => n + 1, 0);
  const refetch = useCallback(() => forceRefetch(), []);

  const setData = useCallback<Dispatch<SetStateAction<T | null>>>(
    (updater) => dispatch({ type: "patch", updater }),
    [],
  );

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: "disable" });
      return;
    }

    const controller = new AbortController();
    dispatch({ type: "load" });

    fetcherRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) dispatch({ type: "resolve", data });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        // A fetcher that surfaces its own AbortError is treated as an abort,
        // not a real failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
        dispatch({
          type: "reject",
          error: err instanceof Error ? err : new Error(String(err)),
        });
      },
    );

    return () => controller.abort();
    // `deps` is a caller-supplied dependency list spread into the array; eslint
    // can't statically verify it, which is the whole point of the generic hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refetchNonce, ...deps]);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    refetch,
    setData,
  };
}
