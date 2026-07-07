"use client";

import { useEffect, useState } from "react";
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

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "staff", label: "Staff" },
  { value: "users", label: "Users" },
  { value: "logs", label: "Logs" },
];

export function AdminScreen() {
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
        <Text variant="secondary">You need to be logged in to view this page.</Text>
        <Button className="mt-4" onClick={() => router.push(`/auth?next=${encodeURIComponent(pathname)}`)}>
          Log in
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-7 py-10">
      <Text as="h1" variant="title" className="text-3xl">
        Admin
      </Text>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            aria-pressed={tab === t.value}
            className={cn(
              "rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.value
                ? "border-acc/30 bg-acc/10 text-acc"
                : "border-border bg-white/[0.03] text-foreground-secondary",
            )}
          >
            {t.label}
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
