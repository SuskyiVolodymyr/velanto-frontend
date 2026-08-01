"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import type { ComponentType } from "react";
import {
  BrowseIcon,
  MyPacksIcon,
  SuggestionsIcon,
  PlusIcon,
  type IconProps,
} from "@/src/shared/components/icons";
import { useAuth } from "@/src/shared/lib/auth-context";
import { cn } from "@/src/shared/lib/cn";

interface Tab {
  key: string;
  href: string;
  // ComponentType (not a plain function-component type) so lucide's
  // forwardRef-based `User` — the one icon here without a hand-authored
  // equivalent — is assignable alongside the IconProps-typed icons.
  icon: ComponentType<IconProps>;
  /** Which translation namespace `key` resolves against — the browse/myPacks/
   * suggestions labels already exist under shell.nav (shared with the desktop
   * rail and mobile drawer); create/profile live in bottomNav itself. */
  labelFrom: "shell" | "bottomNav";
  /** Tapping this tab requires a session; signed-out users go to /auth. */
  requiresAuth: boolean;
  /** The center create action gets the accent treatment. */
  emphasized?: boolean;
}

const TABS: Tab[] = [
  {
    key: "browse",
    href: "/",
    icon: BrowseIcon,
    labelFrom: "shell",
    requiresAuth: false,
  },
  {
    key: "myPacks",
    href: "/my-packs",
    icon: MyPacksIcon,
    labelFrom: "shell",
    requiresAuth: true,
  },
  {
    key: "create",
    href: "/create",
    icon: PlusIcon,
    labelFrom: "bottomNav",
    requiresAuth: true,
    emphasized: true,
  },
  {
    key: "suggestions",
    href: "/feedback",
    icon: SuggestionsIcon,
    labelFrom: "shell",
    requiresAuth: false,
  },
  {
    key: "profile",
    href: "/account",
    icon: User,
    labelFrom: "bottomNav",
    requiresAuth: true,
  },
];

/**
 * Phone-only bottom tab bar (hidden at `md` and up, where the header takes
 * over). Five tabs — Browse / My packs / Create / Suggestions / Profile —
 * mirroring the desktop sidebar's own top five slots (People/History/Rules
 * stay drawer-only), with Create emphasized and raised in the middle. Auth-
 * gated tabs point a signed-out visitor at /auth rather than a dead end (the
 * app-wide rule for mobile nav: tapping a tab is an explicit navigation, so a
 * redirect is expected, not the in-place block used for inline actions).
 */
export function MobileBottomNav() {
  const t = useTranslations("bottomNav");
  const tNav = useTranslations("shell.nav");
  const pathname = usePathname();
  const { status } = useAuth();
  const isAuthed = status === "authenticated";

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-[6px] min-[881px]:hidden"
    >
      {TABS.map((tab) => {
        const href = tab.requiresAuth && !isAuthed ? "/auth" : tab.href;
        const active = pathname === tab.href;
        const label = tab.labelFrom === "shell" ? tNav(tab.key) : t(tab.key);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={active ? "page" : undefined}
            // The emphasized Create tab drops its visible text label below
            // (see the raised-tile comment further down), so it needs its
            // name supplied directly instead.
            aria-label={tab.emphasized ? label : undefined}
            className={cn(
              // min-w-0 lets the flex-1 tabs actually shrink below their content
              // width; without it a long localized label (e.g. uk "Сповіщення")
              // pushes the whole 5-tab bar past the viewport.
              "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
              active
                ? "text-acc"
                : "text-foreground-tertiary hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center",
                tab.emphasized &&
                  "-mt-[22px] h-[52px] w-[52px] rounded-[17px] bg-acc text-background shadow-[0_8px_24px_rgba(0,229,255,0.35)]",
              )}
            >
              <Icon
                size={tab.emphasized ? 22 : 21}
                strokeWidth={tab.emphasized ? 2.6 : 1.8}
              />
            </span>
            {/* The raised Create tile carries no label underneath (mock: the
                circle floats clear of the bar with nothing below it) — every
                other tab keeps its text label. */}
            {!tab.emphasized && (
              <span className="max-w-full truncate">{label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
