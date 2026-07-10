"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useHydratedValue } from "@/src/shared/hooks/useHydratedValue";
import {
  STREAMER_MODE_HYDRATED_ATTR,
  getStoredStreamerMode,
  setStoredStreamerMode,
} from "@/src/shared/lib/streamer-mode";

export interface StreamerModeContextValue {
  /** Whether streamer mode is currently active. */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
  /** True if the given item id has been individually revealed this session. */
  isRevealed: (id: string) => boolean;
  /** Reveal a single item by id (persists only in memory for this session). */
  reveal: (id: string) => void;
}

const StreamerModeContext = createContext<StreamerModeContextValue | null>(null);

export function StreamerModeProvider({ children }: { children: ReactNode }) {
  // The persisted flag is a client-only localStorage read, hydrated via
  // useHydratedValue: server + first client render see `false`, then React
  // swaps to the stored value through the store snapshot — no hydration
  // mismatch, no set-state-in-effect. `override` layers the in-session choice
  // on top so a toggle takes effect immediately.
  const storedEnabled = useHydratedValue(getStoredStreamerMode, false);
  const [override, setOverride] = useState<boolean | null>(null);
  const enabled = override ?? storedEnabled;

  // Per-item reveals are in-memory only (a fresh screen-share should start with
  // everything hidden again) and reset whenever streamer mode is toggled.
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());

  // Once mounted, React fully controls what renders (placeholder vs children),
  // so switch off the blunt pre-hydration hide rule in globals.css.
  useEffect(() => {
    document.documentElement.setAttribute(STREAMER_MODE_HYDRATED_ATTR, "");
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setStoredStreamerMode(next);
    setOverride(next);
    // Toggling either way clears any prior per-item reveals.
    setRevealedIds(new Set());
  }, []);

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  const reveal = useCallback((id: string) => {
    setRevealedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const isRevealed = useCallback((id: string) => revealedIds.has(id), [revealedIds]);

  const value = useMemo<StreamerModeContextValue>(
    () => ({ enabled, setEnabled, toggle, isRevealed, reveal }),
    [enabled, setEnabled, toggle, isRevealed, reveal],
  );

  return <StreamerModeContext.Provider value={value}>{children}</StreamerModeContext.Provider>;
}

export function useStreamerMode(): StreamerModeContextValue {
  const ctx = useContext(StreamerModeContext);
  if (!ctx) throw new Error("useStreamerMode must be used within a StreamerModeProvider");
  return ctx;
}

const DISABLED_STREAMER_MODE: StreamerModeContextValue = {
  enabled: false,
  setEnabled: () => {},
  toggle: () => {},
  isRevealed: () => false,
  reveal: () => {},
};

/**
 * Like {@link useStreamerMode} but tolerates the absence of a provider,
 * returning a permanently-disabled value instead of throwing. The presentational
 * `<Hidden>` uses this so it can render as a plain pass-through when dropped into
 * a tree (e.g. an isolated component test) that hasn't mounted the provider —
 * the real app always has it in the root layout.
 */
export function useStreamerModeOrDefault(): StreamerModeContextValue {
  return useContext(StreamerModeContext) ?? DISABLED_STREAMER_MODE;
}
