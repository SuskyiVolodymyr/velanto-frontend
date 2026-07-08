"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import type { User } from "@/src/shared/types/user";

export function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
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
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const initial = user.username.slice(0, 1).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-border bg-surface text-sm font-semibold text-foreground-secondary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-10 w-[190px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <div className="border-b border-border px-3.5 py-3">
            <Text className="text-sm font-semibold">{user.username}</Text>
            <Text variant="tertiary" className="text-xs">
              {user.email}
            </Text>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm text-foreground hover:bg-white/[0.06]"
          >
            Profile
          </Link>
          <Link
            href="/docs"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm text-foreground hover:bg-white/[0.06]"
          >
            Docs
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm text-foreground hover:bg-white/[0.06]"
          >
            Settings
          </Link>
          {(user.role === "admin" || user.role === "manager") && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3.5 py-2.5 text-sm text-foreground hover:bg-white/[0.06]"
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeAndRefocus();
              onLogout();
            }}
            className="block w-full px-3.5 py-2.5 text-left text-sm text-[#ff6b6b] hover:bg-white/[0.06]"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
