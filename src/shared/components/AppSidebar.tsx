"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Compass,
  Layers,
  Users,
  History,
  Lightbulb,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { BrandMark } from "@/src/shared/components/BrandMark";
import { Text } from "@/src/shared/components/Text";
import { SidebarRoomPill } from "@/src/shared/components/SidebarRoomPill";
import { cn } from "@/src/shared/lib/cn";

interface NavItem {
  key: string;
  /** Destination, or null for a not-yet-built ("soon") destination. */
  href: string | null;
  icon: LucideIcon;
  /** Signed-out users are routed to /auth instead of href. */
  requiresAuth?: boolean;
  /** Active when the current pathname satisfies this (query-agnostic). */
  isActive?: (pathname: string) => boolean;
}

// Order matches the mock: Browse · My packs · People · History · Suggestions ·
// Rules. My packs and People are their own SSR routes now (2.0.0 shell), so the
// active state is a clean pathname match with no query-param reading — the shell
// stays query-agnostic (no useSearchParams here, which would de-opt every page
// out of static rendering). Browse is `/` exactly so it doesn't light up on the
// nested routes.
const NAV_ITEMS: NavItem[] = [
  { key: "browse", href: "/", icon: Compass, isActive: (p) => p === "/" },
  {
    key: "myPacks",
    href: "/my-packs",
    icon: Layers,
    requiresAuth: true,
    isActive: (p) => p === "/my-packs",
  },
  {
    key: "people",
    href: "/people",
    icon: Users,
    isActive: (p) => p === "/people",
  },
  { key: "history", href: null, icon: History },
  { key: "suggestions", href: null, icon: Lightbulb },
  {
    key: "rules",
    href: "/rules",
    icon: ScrollText,
    isActive: (p) => p === "/rules" || p.startsWith("/rules/"),
  },
];

/**
 * The sidebar's inner column — brand, nav, and the room pill. Shared by the
 * desktop rail ({@link AppSidebar}) and the mobile drawer, so it takes
 * `collapsed` (icon-only rail) and `onNavigate` (lets the drawer close itself
 * when a link is tapped). Client-only because active state reads the pathname.
 */
export function SidebarContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const { status } = useAuth();
  const isAuthed = status === "authenticated";

  return (
    <div className="flex h-full flex-col gap-6">
      <Link
        href="/"
        onClick={onNavigate}
        className={cn(
          // Padding is swapped (not appended) so the plain-join cn() never
          // emits both px utilities — the "#236 cascade trap".
          "flex items-center gap-2.5",
          collapsed ? "justify-center px-0" : "px-2",
        )}
      >
        <BrandMark className="h-[26px] w-[26px] flex-none" />
        {!collapsed && (
          <Text
            as="span"
            variant="title"
            className="text-[18px] tracking-[0.18em]"
          >
            VELANTO
          </Text>
        )}
      </Link>

      <nav
        aria-label={t("nav.label")}
        className="flex flex-col gap-1"
      >
        {NAV_ITEMS.map((item) => {
          const soon = item.href === null;
          const active = !soon && item.isActive?.(pathname) === true;
          const href =
            item.requiresAuth && !isAuthed ? "/auth" : (item.href as string);
          const Icon = item.icon;

          const inner = (
            <>
              <Icon
                size={19}
                strokeWidth={2}
                aria-hidden
                className="flex-none"
              />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate">
                  {t(`nav.${item.key}`)}
                </span>
              )}
              {!collapsed && soon && (
                <span className="flex-none rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-tertiary">
                  {t("soon")}
                </span>
              )}
            </>
          );

          const base = cn(
            "flex items-center gap-3 rounded-[11px] py-[11px] text-[14px] font-medium transition-colors",
            collapsed ? "justify-center px-0" : "px-3",
          );

          const label = t(`nav.${item.key}`);

          if (soon) {
            return (
              <span
                key={item.key}
                aria-disabled
                // The collapsed rail hides the label text and the "soon" badge,
                // so name it for assistive tech.
                aria-label={collapsed ? `${label} — ${t("soon")}` : undefined}
                title={collapsed ? label : t("soon")}
                className={cn(
                  base,
                  "cursor-default text-foreground-tertiary",
                )}
              >
                {inner}
              </span>
            );
          }

          return (
            <Link
              key={item.key}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              // Label text is hidden when collapsed, so supply the name.
              aria-label={collapsed ? label : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                base,
                active
                  ? "bg-acc/[0.14] text-foreground"
                  : "text-foreground-secondary hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      {/* Pushed to the bottom; renders nothing unless the signed-in user holds a
          room seat. Hidden in the collapsed rail (no room for its text). */}
      {!collapsed && (
        <div className="mt-auto">
          <SidebarRoomPill onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}

/**
 * The persistent desktop sidebar rail — global chrome for chromed routes.
 * `bg-surface` per the token ladder (rail/top bar/bottom nav = --surface).
 * Hidden below 881px, where the mobile bottom nav + drawer take over. Width
 * animates between the expanded rail and the 78px collapsed rail.
 */
export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-0 hidden h-screen flex-none border-e border-border bg-surface p-4 transition-[width] duration-200 min-[881px]:flex",
        collapsed ? "w-[78px]" : "w-[248px]",
      )}
    >
      <SidebarContent collapsed={collapsed} />
    </aside>
  );
}
