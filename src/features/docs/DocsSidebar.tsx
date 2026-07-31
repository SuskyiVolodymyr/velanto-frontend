"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/src/shared/components/Select";
import { cn } from "@/src/shared/lib/cn";

export type TopicId =
  "start" | "creating" | "formats" | "playing" | "stats" | "api";

export interface NavSection {
  labelKey: string;
  topics: { id: TopicId; labelKey: string }[];
}

export const NAV: NavSection[] = [
  {
    labelKey: "secOverview",
    topics: [{ id: "start", labelKey: "topStart" }],
  },
  {
    labelKey: "secCreators",
    topics: [
      { id: "creating", labelKey: "topCreating" },
      { id: "formats", labelKey: "topFormats" },
    ],
  },
  {
    labelKey: "secPlayers",
    topics: [
      { id: "playing", labelKey: "topPlaying" },
      { id: "stats", labelKey: "topStats" },
    ],
  },
  {
    labelKey: "secDevelopers",
    topics: [{ id: "api", labelKey: "topApi" }],
  },
];

/** Every topic id, in sidebar order — the source of truth for URL validation. */
export const TOPICS: TopicId[] = NAV.flatMap((section) =>
  section.topics.map((topic) => topic.id),
);

export const DEFAULT_TOPIC: TopicId = "start";

export function DocsSidebar({
  activeTopic,
  onSelect,
}: {
  activeTopic: TopicId;
  onSelect: (id: TopicId) => void;
}) {
  const t = useTranslations("docs");
  return (
    <>
      {/* Mobile: a compact dropdown instead of the full stacked list, so the
          article isn't pushed way down the page. Native <select> keeps the
          section grouping (optgroups) and is a11y/SSR-safe. */}
      <Select
        className="min-[820px]:hidden"
        aria-label={t("jumpTo")}
        value={activeTopic}
        onChange={(event) => onSelect(event.target.value as TopicId)}
      >
        {NAV.map((section) => (
          <optgroup key={section.labelKey} label={t(section.labelKey)}>
            {section.topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {t(topic.labelKey)}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>

      {/* Desktop: the sticky sidebar list. `top-20` clears the sticky page
          header — at the old `top-6` the nav slid underneath it on scroll. */}
      <nav className="hidden w-full flex-col gap-6 min-[820px]:sticky min-[820px]:top-20 min-[820px]:flex min-[820px]:w-[220px] min-[820px]:flex-none">
        {NAV.map((section) => (
          <div key={section.labelKey} className="flex flex-col gap-2">
            <span className="px-3 text-[11px] font-[650] uppercase tracking-[0.12em] text-foreground-tertiary">
              {t(section.labelKey)}
            </span>
            <div className="flex flex-col gap-0.5">
              {section.topics.map((topic) => {
                const active = topic.id === activeTopic;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => onSelect(topic.id)}
                    aria-pressed={active}
                    className={cn(
                      "cursor-pointer rounded-[9px] px-3 py-[9px] text-start text-sm font-medium transition-colors",
                      active
                        ? "bg-white/[0.12] text-foreground"
                        : "text-foreground-secondary hover:text-foreground",
                    )}
                  >
                    {t(topic.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}
