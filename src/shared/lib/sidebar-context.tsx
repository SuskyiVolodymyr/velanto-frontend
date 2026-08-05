"use client";

import { createContext, useContext } from "react";

export interface SidebarState {
  /** Whether the desktop rail is in its icon-only form. */
  collapsed: boolean;
  /** Flip the rail on desktop, or open/close the drawer on phones. */
  toggle: () => void;
  /**
   * False when there is no rail to control — i.e. outside {@link AppShell}'s
   * provider, which is the case on the full-screen `/auth` route and in unit
   * tests that render a header on its own. Consumers render nothing rather
   * than a dead button.
   */
  available: boolean;
}

const NO_SIDEBAR: SidebarState = {
  collapsed: false,
  toggle: () => {},
  available: false,
};

const SidebarContext = createContext<SidebarState>(NO_SIDEBAR);

export const SidebarProvider = SidebarContext.Provider;

/**
 * Read the shell's rail state from anywhere beneath it.
 *
 * The seam exists because the control and the thing it controls sit in
 * different trees: AppShell owns the rail, but the toggle lives in each page's
 * own sticky header (PageHeader), which AppShell renders as opaque `children`.
 * Passing a callback down was not an option — those pages are Server
 * Components.
 *
 * Deliberately returns a safe no-op object instead of throwing when there is no
 * provider. A header rendered outside the shell is a normal situation, not a
 * bug, and a throw would turn every isolated header test into a setup chore.
 */
export function useSidebar(): SidebarState {
  return useContext(SidebarContext);
}
