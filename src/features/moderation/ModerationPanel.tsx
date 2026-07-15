"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { useAuth } from "@/src/shared/lib/auth-context";
import { cn } from "@/src/shared/lib/cn";
import { ReportsTab } from "@/src/features/moderation/ReportsTab";
import { PackApprovalsTab } from "@/src/features/moderation/PackApprovalsTab";
import { useModerationCounts } from "@/src/features/moderation/api/moderation.queries";

const TABS = ["reports", "packs"] as const;
type Tab = (typeof TABS)[number];

const DEFAULT_TAB: Tab = "reports";

function tabFromParam(value: string | null): Tab {
  return TABS.includes(value as Tab) ? (value as Tab) : DEFAULT_TAB;
}

/**
 * The staff moderation panel: the report queue and the pack-approval queue,
 * side by side under one roof, in the admin panel's visual language.
 *
 * The active tab lives in the URL rather than in component state (unlike the
 * admin panel's): moderators link each other straight at a queue, and a refresh
 * has to land back on the same one.
 */
export function ModerationPanel() {
  const t = useTranslations("moderation");
  const tCommon = useTranslations("common");
  const tHeader = useTranslations("header");
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = tabFromParam(searchParams.get("tab"));

  const allowed =
    user?.role === "moderator" ||
    user?.role === "manager" ||
    user?.role === "admin";

  useEffect(() => {
    if (status === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [status, allowed, router]);

  const countsQuery = useModerationCounts({ enabled: allowed });

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

  const badges: Record<Tab, number | undefined> = {
    reports: countsQuery.data?.newReports,
    packs: countsQuery.data?.pendingPacks,
  };
  const labels: Record<Tab, string> = {
    reports: t("tabReports"),
    packs: t("tabPacks"),
  };

  // `replace`, not `push`: flipping tabs isn't a navigation step a moderator
  // wants to walk back through with the Back button.
  function selectTab(next: Tab) {
    router.replace(`${pathname}?tab=${next}`, { scroll: false });
  }

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-7 px-7 py-11">
      <section>
        <div className="mb-2.5 flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.14em] text-foreground-tertiary">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-acc" />
          {t("panelEyebrow")}
        </div>
        {/* The mock's heading was "Support queue", but that named a
            reports-only screen; this panel also holds pack approvals. */}
        <Text as="h1" variant="title" className="text-[32px]">
          {t("queueHeading")}
        </Text>
      </section>

      <div role="tablist" className="flex gap-2 border-b border-border">
        {TABS.map((value) => {
          const badge = badges[value];
          const waiting = badge !== undefined && badge > 0 ? badge : null;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              // Spell the name out: the badge is a bare number next to the label,
              // which a screen reader would otherwise read as "Reports7".
              aria-label={
                waiting === null
                  ? labels[value]
                  : `${labels[value]}, ${waiting} waiting`
              }
              onClick={() => selectTab(value)}
              className={cn(
                "mr-[22px] flex items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-semibold transition-colors",
                tab === value
                  ? "border-acc text-foreground"
                  : "border-transparent text-foreground-tertiary hover:text-foreground-secondary",
              )}
            >
              {labels[value]}
              {/* The badge is what makes the merged panel worth having: a
                moderator sees where the work is without opening both tabs.
                Hidden at zero — an empty queue is not news. */}
              {waiting !== null && (
                <span
                  aria-hidden
                  className="rounded-full bg-acc/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-acc"
                >
                  {waiting}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "reports" && <ReportsTab />}
      {tab === "packs" && <PackApprovalsTab />}
    </main>
  );
}
