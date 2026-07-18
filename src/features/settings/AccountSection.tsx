"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { useAuth } from "@/src/shared/lib/auth-context";
import { AddEmailForm } from "@/src/features/settings/AddEmailForm";

export function AccountSection() {
  const t = useTranslations("settings");
  const { status, user } = useAuth();

  if (status === "loading") return null;

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {t("accountHeading")}
      </Text>
      {status === "authenticated" && user && (
        <Card className="hover:translate-y-0 hover:shadow-none">
          {user.email ? (
            <>
              <Text className="font-semibold">{user.email}</Text>
              <Text variant="secondary" className="text-sm">
                {t("accountEmailLabel")}
              </Text>
            </>
          ) : (
            <>
              <Text className="font-semibold">{t("noEmailHeading")}</Text>
              <Text variant="secondary" className="mb-4 text-sm">
                {t("noEmailDescription")}
              </Text>
              <AddEmailForm />
            </>
          )}
        </Card>
      )}
      {status === "unauthenticated" && (
        <div className="rounded-xl border border-dashed border-border-strong px-4 py-4 text-sm text-foreground-secondary">
          {t.rich("loginToViewAccount", {
            link: (chunks) => (
              <Link href="/auth" className="text-acc">
                {chunks}
              </Link>
            ),
          })}
        </div>
      )}
    </section>
  );
}
