"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { buttonClassName } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { BrandMark } from "@/src/shared/components/BrandMark";
import { UserMenu } from "@/src/shared/components/UserMenu";
import { NotificationsBell } from "@/src/shared/components/NotificationsBell";

export function AppHeader() {
  const { user, status, logout } = useAuth();
  const t = useTranslations("header");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden items-center justify-between border-b border-border bg-background/70 px-7 py-6 backdrop-blur-[6px] md:flex">
      <div className="flex items-center gap-7">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-[22px] w-[22px]" />
          <Text
            as="span"
            variant="title"
            className="text-[19px] tracking-[0.2em]"
          >
            VELANTO
          </Text>
        </Link>

        <Link
          href="/"
          className="text-sm text-foreground-secondary transition-colors hover:text-foreground"
        >
          {t("browse")}
        </Link>

        <Link
          href="/feedback"
          className="text-sm text-foreground-secondary transition-colors hover:text-foreground"
        >
          {t("feedback")}
        </Link>

        <Link
          href="/rules"
          className="text-sm text-foreground-secondary transition-colors hover:text-foreground"
        >
          {t("rules")}
        </Link>
      </div>

      {status === "authenticated" && user && (
        <div className="flex items-center gap-3">
          <Link href="/create" className={buttonClassName("primary")}>
            {t("create")}
          </Link>
          <NotificationsBell />
          <UserMenu user={user} onLogout={() => void logout()} />
        </div>
      )}

      {status === "unauthenticated" && (
        <div className="flex items-center gap-5">
          {/* Docs and Settings live in the account menu when signed in; expose
              them here for signed-out visitors (both pages render without a
              session — Settings just shows "log in" prompts on account-scoped
              sections). Kept visible on /auth too; only Log in hides there. */}
          <Link
            href="/docs"
            className="text-sm text-foreground-secondary transition-colors hover:text-foreground"
          >
            {t("docs")}
          </Link>
          <Link
            href="/settings"
            className="text-sm text-foreground-secondary transition-colors hover:text-foreground"
          >
            {t("settings")}
          </Link>
          {pathname !== "/auth" && (
            <Link href="/auth" className={buttonClassName("secondary")}>
              {t("logIn")}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
