"use client";

import Link from "next/link";
import { Text } from "@/src/shared/components/Text";
import { useAuth } from "@/src/shared/lib/auth-context";

export function AccountSection() {
  const { status, user } = useAuth();

  if (status === "loading") return null;

  return (
    <section className="flex flex-col gap-4">
      <Text as="h2" variant="tertiary" className="text-xs uppercase tracking-wide">
        Account
      </Text>
      {status === "authenticated" && user && (
        <div className="rounded-2xl border border-border bg-white/[0.02] px-4 py-4">
          <Text className="font-semibold">{user.email}</Text>
          <Text variant="secondary" className="text-sm">
            Signed in via email
          </Text>
        </div>
      )}
      {status === "unauthenticated" && (
        <div className="rounded-xl border border-dashed border-border-strong px-4 py-4 text-sm text-foreground-secondary">
          <Link href="/auth" className="text-acc">
            Log in
          </Link>{" "}
          to view account settings.
        </div>
      )}
    </section>
  );
}
