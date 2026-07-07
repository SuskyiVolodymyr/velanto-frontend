"use client";

import Link from "next/link";
import { useAuth } from "@/src/shared/lib/auth-context";
import { buttonClassName } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { UserMenu } from "@/src/shared/components/UserMenu";

export function AppHeader() {
  const { user, status, logout } = useAuth();

  return (
    <header className="flex items-center justify-between px-7 py-6">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="h-3 w-3 rotate-45 rounded-sm bg-acc" aria-hidden />
        <Text as="span" variant="title" className="text-[19px] tracking-[0.2em]">
          VELANTO
        </Text>
      </Link>

      {status === "authenticated" && user && (
        <UserMenu user={user} onLogout={() => void logout()} />
      )}

      {status === "unauthenticated" && (
        <Link href="/auth" className={buttonClassName("secondary")}>
          Log in
        </Link>
      )}
    </header>
  );
}
