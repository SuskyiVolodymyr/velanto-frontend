"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { useAuth } from "@/src/shared/lib/auth-context";
import { cn } from "@/src/shared/lib/cn";
import { OverviewTab } from "@/src/features/admin/OverviewTab";
import { StaffTab } from "@/src/features/admin/StaffTab";
import { UsersTab } from "@/src/features/admin/UsersTab";
import { LogsTab } from "@/src/features/admin/LogsTab";

type Tab = "overview" | "staff" | "users" | "logs";

const TABS: { value: Tab; labelKey: string }[] = [
  { value: "overview", labelKey: "tabOverview" },
  { value: "staff", labelKey: "tabStaff" },
  { value: "users", labelKey: "tabUsers" },
  { value: "logs", labelKey: "tabLogs" },
];

export function AdminScreen() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tHeader = useTranslations("header");
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("overview");

  const allowed = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    if (status === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [status, allowed, router]);

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{tCommon("loginRequired")}</Text>
        <Button
          className="mt-4"
          onClick={() =>
            router.push(`/auth?next=${encodeURIComponent(pathname)}`)
          }
        >
          {tHeader("logIn")}
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-7 py-11">
      <section>
        <div className="mb-2.5 flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.14em] text-foreground-tertiary">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-acc" />
          {t("panelEyebrow")}
        </div>
        <Text as="h1" variant="title" className="text-[32px]">
          {t("overviewHeading")}
        </Text>
      </section>

      {/* Underline tabs, per the design — not the pill/chip row used elsewhere. */}
      <div role="tablist" className="flex gap-2 border-b border-border">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.value}
            type="button"
            role="tab"
            aria-selected={tab === tabItem.value}
            onClick={() => setTab(tabItem.value)}
            className={cn(
              "mr-[22px] border-b-2 px-1 py-2.5 text-sm font-semibold transition-colors",
              tab === tabItem.value
                ? "border-acc text-foreground"
                : "border-transparent text-foreground-tertiary hover:text-foreground-secondary",
            )}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "staff" && <StaffTab />}
      {tab === "users" && <UsersTab />}
      {tab === "logs" && <LogsTab />}
    </main>
  );
}
