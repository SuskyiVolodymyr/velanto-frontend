"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
import { useAuth } from "@/src/shared/lib/auth-context";
import { HomeFeed } from "@/src/features/home/HomeFeed";
import { MyPacksFeed } from "@/src/features/home/MyPacksFeed";
import type { PacksFeedResult } from "@/src/features/home/api/packs-feed";

type Tab = "packs" | "mine";

/**
 * Top-level Browse switcher: the public discovery feed ("Packs") and the
 * signed-in user's own packs ("My packs"). The "My packs" tab only appears once
 * auth has settled as signed-in — it's hidden while loading (no flicker) and for
 * signed-out visitors. If the user signs out while on it, we fall back to the
 * public feed so the view can never be stranded on a tab that no longer exists.
 *
 * The People tab is a separate, later piece of work.
 */
export function BrowseTabs({ initialFeed }: { initialFeed?: PacksFeedResult }) {
  const t = useTranslations("myPacks");
  const { status } = useAuth();
  const signedIn = status === "authenticated";
  const [tab, setTab] = useState<Tab>("packs");

  const activeTab: Tab = tab === "mine" && !signedIn ? "packs" : tab;

  const tabs: { value: Tab; label: string }[] = [
    { value: "packs", label: t("packsTab") },
    ...(signedIn ? [{ value: "mine" as const, label: t("mineTab") }] : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" className="flex gap-2 border-b border-border">
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            onClick={() => setTab(value)}
            className={cn(
              "mr-[22px] border-b-2 px-1 py-2.5 text-sm font-semibold transition-colors",
              activeTab === value
                ? "border-acc text-foreground"
                : "border-transparent text-foreground-tertiary hover:text-foreground-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "mine" ? (
        <MyPacksFeed />
      ) : (
        <HomeFeed initialFeed={initialFeed} />
      )}
    </div>
  );
}
