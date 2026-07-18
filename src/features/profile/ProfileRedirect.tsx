"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";

/**
 * `/profile` is now just an entry point to the owner's own public profile at
 * `/users/[id]` — the single shareable, SEO'd page (the old separate
 * ProfileScreen was merged into AuthorScreen). An authenticated visitor is
 * redirected there; a signed-out visitor gets the same login prompt the old
 * ProfileScreen showed (a block, not a surprise redirect to /auth).
 */
export function ProfileRedirect() {
  const t = useTranslations("profile");
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(`/users/${user.id}`);
    }
  }, [status, user, router]);

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("loginRequiredView")}</Text>
        <Link
          href="/auth?next=%2Fprofile"
          className={buttonClassName("primary", "mt-4 w-fit")}
        >
          {t("logIn")}
        </Link>
      </div>
    );
  }

  // Authenticated (redirect in flight) or still resolving: the route-level
  // loading.tsx skeleton covers the brief gap.
  return null;
}
