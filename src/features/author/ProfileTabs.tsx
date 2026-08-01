"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
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
    <div className="flex flex-col gap-3.5">
      {/* Underlined tabs (per the mock) — physical `gap` not `mr-`, so the
          spacing stays correct under RTL locales without a logical-property
          utility per item. */}
      <div
        role="tablist"
        className="flex flex-wrap gap-[22px] border-b border-white/[0.07]"
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
                "flex cursor-pointer items-center gap-2 border-b-2 px-1 py-[11px] text-sm font-[650] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                selected
                  ? "border-acc text-foreground"
                  : "border-transparent text-foreground-tertiary hover:text-foreground-secondary",
              )}
            >
              {labels[tabItem]}
              {/* A plain span, not `Badge`: the mock's count is a 6px-radius
                  mono chip, and Badge is a fully-round 11px/700 pill. Passing
                  the differences via className would leave BOTH geometries in
                  the class list — `cn()` is a plain join, not tailwind-merge. */}
              {count !== undefined && (
                <span
                  data-mono
                  className={cn(
                    "rounded-[6px] px-[7px] py-0.5 text-[11px] font-bold tabular-nums",
                    selected
                      ? "bg-acc/[0.14] text-acc-hover"
                      : "bg-white/[0.06] text-foreground-tertiary",
                  )}
                >
                  {count}
                </span>
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
