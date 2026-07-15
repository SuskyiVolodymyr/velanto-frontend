"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Compass, MessageSquare, Plus, Bell, User } from "lucide-react";
import type { ComponentType } from "react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useNotifications } from "@/src/shared/components/use-notifications";
import { cn } from "@/src/shared/lib/cn";

interface Tab {
  key: string;
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Tapping this tab requires a session; signed-out users go to /auth. */
  requiresAuth: boolean;
  /** The center create action gets the accent treatment. */
  emphasized?: boolean;
}

const TABS: Tab[] = [
  { key: "discovery", href: "/", icon: Compass, requiresAuth: false },
  {
    key: "feedback",
    href: "/feedback",
    icon: MessageSquare,
    requiresAuth: false,
  },
  {
    key: "create",
    href: "/create",
    icon: Plus,
    requiresAuth: true,
    emphasized: true,
  },
  {
    key: "notifications",
    href: "/notifications",
    icon: Bell,
    requiresAuth: true,
  },
  { key: "profile", href: "/account", icon: User, requiresAuth: true },
];

/**
 * Phone-only bottom tab bar (hidden at `md` and up, where the header takes
 * over). Five tabs — Discovery / Feedback / Create / Notifications / Profile —
 * with Create emphasized in the middle. Auth-gated tabs point a signed-out
 * visitor at /auth rather than a dead end (the app-wide rule for mobile nav:
 * tapping a tab is an explicit navigation, so a redirect is expected, not the
 * in-place block used for inline actions).
 */
export function MobileBottomNav() {
  const t = useTranslations("bottomNav");
  const pathname = usePathname();
  const { status } = useAuth();
  const isAuthed = status === "authenticated";
  const { unreadCount } = useNotifications();

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-[6px] md:hidden"
    >
      {TABS.map((tab) => {
        const href = tab.requiresAuth && !isAuthed ? "/auth" : tab.href;
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
              active
                ? "text-acc"
                : "text-foreground-tertiary hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center",
                tab.emphasized &&
                  "h-9 w-9 rounded-full bg-acc text-background shadow-[0_4px_14px_rgba(0,0,0,0.4)]",
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
              {tab.key === "notifications" && isAuthed && unreadCount > 0 && (
                <span className="absolute right-[22%] top-1 h-2 w-2 rounded-full border-2 border-background bg-acc" />
              )}
            </span>
            <span>{t(tab.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
