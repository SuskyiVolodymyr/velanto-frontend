"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { buttonClassName } from "@/src/shared/components/Button";
import { BrandMark } from "@/src/shared/components/BrandMark";
import { Text } from "@/src/shared/components/Text";
import { SearchField } from "@/src/shared/components/SearchField";
import { UserMenu } from "@/src/shared/components/UserMenu";
import { NotificationsBell } from "@/src/shared/components/NotificationsBell";

/**
 * Global top bar for chromed routes: menu toggle (collapses the desktop rail /
 * opens the mobile drawer), global pack search, and the account cluster.
 *
 * The search routes to the browse page with a `q` query; D1b wires the feed to
 * consume it (today it unifies only packs — people/tags search is deferred). A
 * `/` hotkey focuses it, matching the design's key hint.
 */
export function AppTopBar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const t = useTranslations("shell");
  const th = useTranslations("header");
  // Search field reuses the home feed's labels; D1a searches packs only, so the
  // honest "Search packs…" wins over the mock's aspirational "people, tags…"
  // until unified search lands.
  const thome = useTranslations("home");
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // `/` focuses search, unless the user is already typing in a field.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function onSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-[12px] min-[881px]:gap-4 min-[881px]:px-[30px]">
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label={t("menuToggle")}
        className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-surface-raised text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
      >
        <Menu size={19} strokeWidth={2} aria-hidden />
      </button>

      {/* Brand shows on mobile, where the sidebar (which carries the brand) is a
          closed drawer. Hidden from 881px up, where the rail is present. */}
      <Link
        href="/"
        className="flex items-center gap-2 min-[881px]:hidden"
        aria-label="Velanto"
      >
        <BrandMark className="h-[22px] w-[22px]" />
        <Text as="span" variant="title" className="text-[16px] tracking-[0.18em]">
          VELANTO
        </Text>
      </Link>

      <form
        onSubmit={onSearchSubmit}
        role="search"
        className="hidden min-w-0 flex-1 min-[881px]:flex"
      >
        <SearchField
          ref={searchRef}
          showKeyHint
          aria-label={thome("searchLabel")}
          placeholder={thome("searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full max-w-[520px] border-white/[0.06] bg-surface-raised"
        />
      </form>

      {status === "authenticated" && user && (
        <div className="ms-auto flex items-center gap-2.5 min-[881px]:gap-3">
          <Link
            href="/create"
            className={buttonClassName("primary")}
          >
            {th("create")}
          </Link>
          <NotificationsBell />
          <UserMenu user={user} onLogout={() => void logout()} />
        </div>
      )}

      {status === "unauthenticated" && (
        <div className="ms-auto flex items-center gap-4 min-[881px]:gap-5">
          <Link
            href="/docs"
            className="hidden text-sm text-foreground-secondary transition-colors hover:text-foreground min-[881px]:inline"
          >
            {th("docs")}
          </Link>
          <Link
            href="/settings"
            className="hidden text-sm text-foreground-secondary transition-colors hover:text-foreground min-[881px]:inline"
          >
            {th("settings")}
          </Link>
          <Link href="/auth" className={buttonClassName("secondary")}>
            {th("logIn")}
          </Link>
        </div>
      )}
    </header>
  );
}
