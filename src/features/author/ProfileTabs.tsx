"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
import { Badge } from "@/src/shared/components/Badge";
import type { PeopleSubTab } from "./AuthorProfileHeader";

export type ProfileTab = "packs" | "people" | "history";

const TABS: ProfileTab[] = ["packs", "people", "history"];

/**
 * The Packs / People / History tab shell for `AuthorScreen` (resolves plan
 * D2). Owns which tab is active; panel *content* is supplied by the caller
 * as slots so this component has zero dependency on `AuthorPackList` /
 * `PeopleTab` / `RecentlyPlayedSection`'s own implementations (those are
 * separate tasks — T3/T4/T5 — landing after this one).
 *
 * `peoplePanel` is a render prop rather than a plain node because the People
 * tab needs to know which sub-tab (`followers`/`following`) to seed — the
 * future `PeopleTab` (T3) will own its own Followers/Following switch
 * internally, exactly like `FollowListModal` does today, so this component
 * only ever tells it where to start.
 *
 * `initialTab`/`initialPeopleSubTab` are, as the name says, only consulted
 * once on mount — mirroring `FollowListModal`'s own `initialTab` precedent,
 * which likewise only resets because the modal fully unmounts/remounts on
 * each open. A future caller that wants to jump to a different tab *after*
 * this component is already mounted (e.g. `AuthorProfileHeader`'s stat
 * buttons via `onSelectPeopleTab`, wired in T7) should force a remount with
 * a `key` rather than expect a live prop change to move the selection.
 */
export function ProfileTabs({
  isOwnProfile,
  packsCount,
  peopleCount,
  initialTab = "packs",
  initialPeopleSubTab = "followers",
  packsPanel,
  peoplePanel,
  historyPanel,
}: {
  isOwnProfile: boolean;
  /** Own profile: total incl. non-approved; visitor: approved-only (both already server-computed into this number by the caller). */
  packsCount: number;
  /** Followers + following, combined. */
  peopleCount: number;
  initialTab?: ProfileTab;
  initialPeopleSubTab?: PeopleSubTab;
  packsPanel: ReactNode;
  peoplePanel: (initialSubTab: PeopleSubTab) => ReactNode;
  historyPanel: ReactNode;
}) {
  const t = useTranslations("profile");
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);

  const labels: Record<ProfileTab, string> = {
    packs: t("packs"),
    people: t("people"),
    // "Recently played" for a visitor, "History" for the owner — same data,
    // the owner additionally gets the play-history visibility toggle (T5).
    history: isOwnProfile ? t("history") : t("recentlyPlayed"),
  };

  // History has no count here: `ProfileTabs` doesn't fetch anything itself,
  // and the History count would come from `RecentlyPlayedSection`'s own
  // query (lazy — per the plan, not worth threading up just for a pill).
  const counts: Partial<Record<ProfileTab, number>> = {
    packs: packsCount,
    people: peopleCount,
  };

  return (
    <div>
      {/* Underlined tabs (per the mock) — physical `gap` not `mr-`, so the
          spacing stays correct under RTL locales without a logical-property
          utility per item. */}
      <div
        role="tablist"
        className="mb-6 flex gap-[22px] border-b border-border"
      >
        {TABS.map((tabItem) => {
          const selected = activeTab === tabItem;
          const count = counts[tabItem];
          return (
            <button
              key={tabItem}
              type="button"
              role="tab"
              id={`profile-tab-${tabItem}`}
              aria-selected={selected}
              aria-controls={`profile-tabpanel-${tabItem}`}
              onClick={() => setActiveTab(tabItem)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                selected
                  ? "border-acc text-foreground"
                  : "border-transparent text-foreground-tertiary hover:text-foreground-secondary",
              )}
            >
              {labels[tabItem]}
              {count !== undefined && (
                <Badge
                  variant={selected ? "accent" : "default"}
                  className="px-1.5 py-0.5 text-[10px] tabular-nums"
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`profile-tabpanel-${activeTab}`}
        aria-labelledby={`profile-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "packs" && packsPanel}
        {activeTab === "people" && peoplePanel(initialPeopleSubTab)}
        {activeTab === "history" && historyPanel}
      </div>
    </div>
  );
}
