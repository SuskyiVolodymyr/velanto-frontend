"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Same pause every search box in the app waits out (admin, feedback, people). */
const SEARCH_DEBOUNCE_MS = 300;

interface SearchQueryValue {
  /** Exactly what's in the field — untrimmed, updated on every keystroke. */
  input: string;
  setInput: (value: string) => void;
  /** Trimmed and debounced: the term the feed actually fetches on. */
  query: string;
  /** Publish `input` now instead of waiting out the pause (Enter). */
  commit: () => void;
  /**
   * False until the mount effect below has read `?q=`. Consumers must prefer
   * their own server-rendered term while it's false — `query` is legitimately
   * empty both before adoption AND after the user clears the box, and only
   * this flag tells those apart.
   */
  hydrated: boolean;
}

const SearchQueryContext = createContext<SearchQueryValue | null>(null);

/**
 * Shares the dashboard's search term between the top bar (which owns the input)
 * and the feed (which owns the results), so typing filters as you go instead of
 * needing Enter.
 *
 * The two live in different trees — the bar is app chrome in {@link AppShell},
 * the feed is page content — so this context is the seam. It deliberately is
 * NOT a router navigation: `/` is a Server Component that reads `?q=` and does
 * its own DB-backed fetch, so a `router.push` per keystroke would re-run that
 * on every pause AND remount the feed (losing the filter bar's state mid-type).
 * Instead the debounced term drives the client's React Query fetch, and the URL
 * is kept in step with `history.replaceState` — the address bar still carries
 * `?q=`, so a search is copyable and reloadable, but changing it costs nothing.
 *
 * The input starts empty and adopts `?q=` after mount rather than reading it
 * during render: the server has no window to read, and seeding from
 * `location.search` inline would hydrate a different value than it rendered.
 * The RESULTS don't wait for that — the home page already passes the URL's `q`
 * straight into the feed as its server-rendered seed.
 */
export function SearchQueryProvider({ children }: { children: ReactNode }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Adopt a shared/reloaded `?q=` link into the field, once, after mount.
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q") ?? "";
    /* eslint-disable react-hooks/set-state-in-effect */
    if (initial) {
      setInput(initial);
      setQuery(initial.trim());
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Publish only once typing pauses. Setting state from a timeout isn't the
  // render-phase cascade the set-state-in-effect rule is aimed at, so no
  // suppression is needed here.
  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(input.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [input]);

  // Mirror the published term into the URL. replaceState, not push: a search is
  // a refinement of the page you're on, so filling in the box shouldn't stack
  // up one back-button entry per pause.
  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    if (url.href !== window.location.href) {
      window.history.replaceState(null, "", url);
    }
  }, [hydrated, query]);

  const commit = useCallback(() => setQuery(input.trim()), [input]);

  const value = useMemo(
    () => ({ input, setInput, query, commit, hydrated }),
    [input, query, commit, hydrated],
  );

  return (
    <SearchQueryContext.Provider value={value}>
      {children}
    </SearchQueryContext.Provider>
  );
}

/**
 * Read the shared search term. Returns an inert value outside the provider so a
 * feed rendered on its own (a test, a future embed) still works — it just never
 * receives a search.
 */
export function useSearchQuery(): SearchQueryValue {
  return useContext(SearchQueryContext) ?? INERT;
}

// `hydrated: false` on purpose — a feed outside the provider keeps using its
// own server-rendered term forever instead of being cleared by a search box
// that isn't there.
const INERT: SearchQueryValue = {
  input: "",
  setInput: () => {},
  query: "",
  commit: () => {},
  hydrated: false,
};
