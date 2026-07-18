"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  User as UserIcon,
  ScrollText,
  BookOpen,
  Settings as SettingsIcon,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Text } from "@/src/shared/components/Text";
import { Hidden } from "@/src/shared/components/Hidden";

interface Row {
  key: string;
  href: string;
  icon: LucideIcon;
}

/**
 * The phone "Profile" tab: a full-screen account hub that replaces the desktop
 * account popup (the header is hidden on mobile). Rules live here too — moved
 * off the header, which no longer exists on phones. Reachable at /account; the
 * bottom nav only routes here for a signed-in user, but it self-guards anyway.
 */
export function MobileAccountScreen() {
  const t = useTranslations("header");
  const { user, status, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth");
  }, [status, router]);

  if (status !== "authenticated" || !user) return null;

  const rows: Row[] = [
    { key: "profile", href: `/users/${user.id}`, icon: UserIcon },
    { key: "rules", href: "/rules", icon: ScrollText },
    { key: "docs", href: "/docs", icon: BookOpen },
    { key: "settings", href: "/settings", icon: SettingsIcon },
  ];
  const isStaff =
    user.role === "moderator" ||
    user.role === "manager" ||
    user.role === "admin";
  if (isStaff)
    rows.push({ key: "moderation", href: "/moderation", icon: ShieldCheck });
  if (user.role === "admin" || user.role === "manager")
    rows.push({ key: "admin", href: "/admin", icon: LayoutDashboard });

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 py-8">
      <Link
        href={`/users/${user.id}`}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <UserAvatar
          username={user.username}
          avatarKey={user.avatarKey}
          className="h-12 w-12 rounded-xl text-base"
        />
        <div className="min-w-0">
          <Text className="truncate text-lg font-semibold">
            <Hidden kind="name" id={user.id}>
              {user.username}
            </Hidden>
          </Text>
          <Text variant="tertiary" className="text-sm">
            {t("profile")}
          </Text>
        </div>
        <ChevronRight
          className="ms-auto h-5 w-5 text-foreground-tertiary"
          aria-hidden
        />
      </Link>

      <nav className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <Link
              key={row.key}
              href={row.href}
              className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5 text-sm text-foreground last:border-b-0 hover:bg-white/[0.04]"
            >
              <Icon className="h-5 w-5 text-foreground-secondary" aria-hidden />
              {t(row.key)}
              <ChevronRight
                className="ms-auto h-4 w-4 text-foreground-tertiary"
                aria-hidden
              />
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => void logout()}
        className="flex items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3.5 text-sm font-medium text-danger transition-colors hover:bg-danger/20"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        {t("logOut")}
      </button>
    </main>
  );
}
