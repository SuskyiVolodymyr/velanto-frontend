"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  User as UserIcon,
  BookOpen,
  Settings as SettingsIcon,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { Hidden } from "@/src/shared/components/Hidden";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import type { User } from "@/src/shared/types/user";

// Shared layout for every row in the menu: a leading icon and the label, so the
// links and the log-out button line up on the same grid.
const MENU_ITEM_CLASS =
  "flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-white/[0.06]";
const MENU_ICON_CLASS = "h-4 w-4 shrink-0";

export function UserMenu({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const t = useTranslations("header");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeAndRefocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeAndRefocus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("accountMenu")}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[11px] border border-border bg-surface text-sm font-semibold text-foreground-secondary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <UserAvatar
          username={user.username}
          avatarKey={user.avatarKey}
          className="h-full w-full rounded-[10px] text-sm"
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-12 z-10 w-[190px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <div className="border-b border-border px-3.5 py-3">
            <Text className="text-sm font-semibold">
              <Hidden kind="name" id={user.id}>
                {user.username}
              </Hidden>
            </Text>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${MENU_ITEM_CLASS} text-foreground`}
          >
            <UserIcon className={MENU_ICON_CLASS} aria-hidden />
            {t("profile")}
          </Link>
          <Link
            href="/docs"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${MENU_ITEM_CLASS} text-foreground`}
          >
            <BookOpen className={MENU_ICON_CLASS} aria-hidden />
            {t("docs")}
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${MENU_ITEM_CLASS} text-foreground`}
          >
            <SettingsIcon className={MENU_ICON_CLASS} aria-hidden />
            {t("settings")}
          </Link>
          {/* One staff link, not two: reports and pack approvals are tabs of a
              single panel now. */}
          {(user.role === "moderator" ||
            user.role === "manager" ||
            user.role === "admin") && (
            <Link
              href="/moderation"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`${MENU_ITEM_CLASS} text-foreground`}
            >
              <ShieldCheck className={MENU_ICON_CLASS} aria-hidden />
              {t("moderation")}
            </Link>
          )}
          {(user.role === "admin" || user.role === "manager") && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`${MENU_ITEM_CLASS} text-foreground`}
            >
              <LayoutDashboard className={MENU_ICON_CLASS} aria-hidden />
              {t("admin")}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeAndRefocus();
              onLogout();
            }}
            className={`${MENU_ITEM_CLASS} w-full text-start text-danger`}
          >
            <LogOut className={MENU_ICON_CLASS} aria-hidden />
            {t("logOut")}
          </button>
        </div>
      )}
    </div>
  );
}
