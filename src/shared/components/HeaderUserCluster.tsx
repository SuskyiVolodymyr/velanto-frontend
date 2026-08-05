"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { NotificationsBell } from "@/src/shared/components/NotificationsBell";
import { UserMenu } from "@/src/shared/components/UserMenu";
import { buttonClassName } from "@/src/shared/components/Button";
import { useAuth } from "@/src/shared/lib/auth-context";

/**
 * The account controls — notifications bell and user popup — for pages that
 * carry their own sticky header instead of the dashboard's {@link AppTopBar}.
 *
 * Closes the gap AppShell's docblock recorded: once the global top bar became
 * dashboard-only, every other desktop page lost any route to notifications,
 * preferences or log out, and the only way back was navigating to `/` first.
 *
 * Signed out it renders the log-in link instead. That is not scope creep — the
 * user popup IS the signed-in half of this control, and shipping only that half
 * would leave a signed-out visitor on, say, /rules with no way to sign in at
 * all, which is the same dead end in a different costume.
 *
 * Desktop-only, matching {@link SidebarToggle}: below 881px MobileBottomNav
 * already carries notifications and profile, and a second copy would both
 * duplicate it and crowd headers that are tight on a phone.
 *
 * NOT shared with AppTopBar. That bar's cluster also owns the Create button and
 * a different gap scale, and folding the two together would mean changing the
 * dashboard to serve every other page. The overlap is two elements; the drift
 * risk is worth less than leaving the dashboard alone.
 */
export function HeaderUserCluster() {
  const t = useTranslations("header");
  // Plain useAuth, deliberately — no second useOptionalAuth export. Most screen
  // tests `vi.mock` this module and stub only `useAuth`, so a second export
  // broke ~15 suites with "no useOptionalAuth on the mock". useAuth itself now
  // degrades to signed-out without a provider, which covers the same case
  // without widening the module's surface.
  const { user, status, logout } = useAuth();

  // `user.username` rather than just `user`: UserMenu renders an avatar from
  // the initial and would throw on a user without one. That cannot happen in
  // the app — username is required on the type and always present — but this
  // component is now inside the header of ~30 screens, many of whose tests
  // stub useAuth with a deliberately partial user ({ id, role }) that is
  // complete for the screen under test. Chrome should thin out for an
  // incomplete user, not take the page down with it.
  if (status === "authenticated" && user?.username) {
    return (
      <div className="hidden items-center gap-2.5 min-[881px]:flex">
        <NotificationsBell />
        <UserMenu user={user} onLogout={() => void logout()} />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Link
        href="/auth"
        className={`hidden min-[881px]:inline-flex ${buttonClassName("secondary", undefined, "sm")}`}
      >
        {t("logIn")}
      </Link>
    );
  }

  // status === "loading": render nothing rather than a placeholder that would
  // pop into a different shape once auth resolves.
  return null;
}
