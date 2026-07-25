"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "@/src/shared/components/AppHeader";
import { BannedBanner } from "@/src/shared/components/BannedBanner";
import { SiteFooter } from "@/src/shared/components/SiteFooter";
import { MobileBottomNav } from "@/src/shared/components/MobileBottomNav";
import { RoomPresenceIndicator } from "@/src/features/friends-rooms/RoomPresenceIndicator";

// Routes that render full-screen without the app chrome (header/footer/nav).
// Currently just /auth, whose design is a standalone split screen with its own
// branding. The optional locale prefix keeps it correct if URL localization is
// ever turned on.
function isFullScreenRoute(pathname: string): boolean {
  return /^(?:\/[a-z]{2})?\/auth(?:\/|$)/.test(pathname);
}

/**
 * Wraps every page with the global chrome — except on full-screen routes, where
 * it renders the page alone. A client component so it can branch on the current
 * path, but it still server-renders (usePathname resolves during SSR), so the
 * chrome stays in the initial HTML for SEO. `children` is passed through the
 * client boundary, so pages themselves remain Server Components.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isFullScreenRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <AppHeader />
      <BannedBanner />
      {children}
      <SiteFooter />
      <MobileBottomNav />
      {/* Floating "you're in a room" affordance; renders nothing unless the
          signed-in user holds a room seat. */}
      <RoomPresenceIndicator />
    </>
  );
}
