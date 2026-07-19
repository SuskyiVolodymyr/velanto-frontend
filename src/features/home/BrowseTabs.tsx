"use client";

import { useId, useState, type KeyboardEvent } from "react";
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
 * Implements the full WAI-ARIA tabs pattern: each tab controls the shared
 * tabpanel, and Left/Right/Home/End move (and activate) between tabs with a
 * roving tabindex. The People tab is a separate, later piece of work.
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

  const baseId = useId();
  const tabId = (value: Tab) => `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel`;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((entry) => entry.value === activeTab);
    if (index === -1) return;
    let next = index;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextTab = tabs[next].value;
    setTab(nextTab);
    // Move focus with selection (automatic activation), per the tabs pattern.
    document.getElementById(tabId(nextTab))?.focus();
  }

  return (
    <div className="flex flex-col gap-8">
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className="flex gap-2 border-b border-border"
      >
        {tabs.map(({ value, label }) => {
          const selected = activeTab === value;
          return (
            <button
              key={value}
              id={tabId(value)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(value)}
              className={cn(
                "mr-[22px] border-b-2 px-1 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                  ? "border-acc text-foreground"
                  : "border-transparent text-foreground-tertiary hover:text-foreground-secondary",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(activeTab)}>
        {activeTab === "mine" ? (
          <MyPacksFeed />
        ) : (
          <HomeFeed initialFeed={initialFeed} />
        )}
      </div>
    </div>
  );
}
