"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { AppSidebar, SidebarContent } from "@/src/shared/components/AppSidebar";
import { AppTopBar } from "@/src/shared/components/AppTopBar";
import { BannedBanner } from "@/src/shared/components/BannedBanner";
import { SiteFooter } from "@/src/shared/components/SiteFooter";
import { MobileBottomNav } from "@/src/shared/components/MobileBottomNav";
import { RoomPresenceIndicator } from "@/src/features/friends-rooms/RoomPresenceIndicator";
import { cn } from "@/src/shared/lib/cn";

// Routes that render full-screen without ANY app chrome (sidebar/top bar/nav).
// Currently just /auth, whose design is a standalone split screen with its own
// branding. The optional locale prefix keeps it correct if URL localization is
// ever turned on.
function isFullScreenRoute(pathname: string): boolean {
  return /^(?:\/[a-z]{2})?\/auth(?:\/|$)/.test(pathname);
}

// The persistent left nav rail (Browse/My packs/People/History/Suggestions/
// Rules) is Dashboard-only chrome, per the mocks: Dashboard.dc.html is the
// only screen carrying `data-el="sidebar"` — Admin.dc.html, Rules.dc.html,
// Docs.dc.html etc. each have their own simple top header with no rail at
// all. Every other route keeps the top bar (search/create/notifications/
// account) but not the rail. The optional locale prefix mirrors
// isFullScreenRoute above — trailing slash is optional too, since
// next-intl's localePrefix emits the root as `/en` with no slash.
function isDashboardRoute(pathname: string): boolean {
  return /^(?:\/[a-z]{2})?\/?$/.test(pathname);
}

// Below this width the rail is hidden and the mobile bottom nav + drawer take
// over; between it and the desktop floor the rail is forced to its collapsed
// (icon-only) form regardless of the user's toggle. Kept in sync with the
// `min-[881px]:` / `max-[1180px]:` variants sprinkled through the shell.
const MOBILE_MAX = 880;
const NARROW_DESKTOP = "(min-width: 881px) and (max-width: 1180px)";

/**
 * Wraps every page with the global chrome — a persistent left sidebar rail, a
 * top bar, and (on phones) the bottom nav + an off-canvas drawer — except on
 * full-screen routes, where it renders the page alone. A client component so it
 * can branch on the path and own the collapse/drawer state, but pages passed as
 * `children` stay Server Components and the chrome still server-renders.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // User's desktop rail preference (only meaningful >=1181px).
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 881-1180px forces the collapsed rail; tracked in JS because the icon-only
  // content (not just the width) depends on it.
  const [narrowDesktop, setNarrowDesktop] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_DESKTOP);
    const update = () => setNarrowDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Crossing up to the desktop rail closes any open drawer, so it can't linger
  // (still scroll-locking the body) behind the now-visible rail.
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MOBILE_MAX + 1}px)`);
    const onChange = () => setDrawerOpen((open) => (mq.matches ? false : open));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // The drawer is a modal overlay, so every reachable navigation while it's
  // open is a nav link — those close it via `onNavigate`. No route effect
  // needed, which also avoids a setState-in-effect cascade.

  if (isFullScreenRoute(pathname)) {
    return <>{children}</>;
  }

  // Gates the WHOLE global chrome bundle now, not just the rail: the top bar
  // (search/create/notifications/account) is global chrome too, and stacking
  // it above a page's own local header (Pack Detail's Back/Share/Vote bar,
  // both `sticky top-0`) produced a visible double-header. A handful of pages
  // already own a local `sticky top-0` header of their own (Pack Detail,
  // Profile Edit, Create Pack, Result, Play) and the global bar no longer
  // layers on top of those. KNOWN GAP, not yet fixed: most other pages
  // (Rules, Docs, People, My Packs, Settings, Feedback, Admin, ...) have a
  // page heading but no real header/account cluster, so on desktop they now
  // render with NO way to reach Create/Notifications/Account/Log out except
  // navigating back to `/` first — this is a real usability regression, only
  // accepted because the mocks call for entirely per-page headers that
  // haven't been built yet (separate, larger job). Mobile is unaffected
  // (MobileBottomNav always carries Create/Notifications/Profile regardless
  // of route).
  const onDashboard = isDashboardRoute(pathname);

  // The menu toggle opens the drawer on phones and collapses the rail on
  // desktop — read the viewport at click time rather than tracking it. Not
  // rendered at all off the dashboard, where there's no rail/drawer to open.
  const onMenuToggle = () => {
    if (window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches) {
      setDrawerOpen((open) => !open);
    } else {
      setCollapsed((c) => !c);
    }
  };

  return (
    <div className="flex min-h-full">
      {onDashboard && (
        <>
          <AppSidebar collapsed={collapsed || narrowDesktop} />
          <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
        </>
      )}

      {/* Content column. Bottom padding clears the fixed MobileBottomNav (its
          emphasized Create button makes it ~4.5rem) plus the safe-area inset,
          dropping away from 881px up where the nav is gone. */}
      <div className="flex min-h-full min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[881px]:pb-0">
        {onDashboard && <AppTopBar onMenuToggle={onMenuToggle} />}
        <BannedBanner />
        {children}
        {onDashboard && <SiteFooter />}
      </div>

      <MobileBottomNav />
      {/* Floating "you're in a room" affordance. On the dashboard it's
          constrained to mobile, since the sidebar's own room pill covers
          desktop there; everywhere else the sidebar (and its pill) is gone
          entirely, so this becomes the only "you're in a room" affordance at
          any width. */}
      <div className={onDashboard ? "contents min-[881px]:hidden" : "contents"}>
        <RoomPresenceIndicator />
      </div>
    </div>
  );
}

/**
 * Phone-only off-canvas sidebar: scrim + sliding panel over the same nav. While
 * open it is a modal dialog — it locks body scroll, closes on Escape or scrim
 * click, moves focus into the panel, traps Tab, and restores focus on close.
 * While closed the panel is `inert` + `aria-hidden` so its off-screen links
 * stay out of the tab order and the accessibility tree.
 */
function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("shell");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];

    focusables()[0]?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 min-[881px]:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.label")}
        inert={!open}
        aria-hidden={!open || undefined}
        className={cn(
          "absolute inset-y-0 start-0 w-[262px] border-e border-border bg-surface p-4 transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
