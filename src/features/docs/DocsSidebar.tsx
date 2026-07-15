"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

export type TopicId = "start" | "creating" | "formats" | "playing" | "stats";

interface NavSection {
  labelKey: string;
  topics: { id: TopicId; labelKey: string }[];
}

const NAV: NavSection[] = [
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
];

export function DocsSidebar({
  activeTopic,
  onSelect,
}: {
  activeTopic: TopicId;
  onSelect: (id: TopicId) => void;
}) {
  const t = useTranslations("docs");
  return (
    <nav className="flex w-full flex-col gap-6 md:sticky md:top-[80px] md:w-[220px] md:flex-none">
      {NAV.map((section) => (
        <div key={section.labelKey}>
          <Text
            variant="tertiary"
            className="mb-2 pl-3 text-[11px] font-semibold tracking-[0.12em]"
          >
            {t(section.labelKey)}
          </Text>
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
                    "rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                    active
                      ? "bg-white/[0.12] text-foreground"
                      : "text-foreground-secondary",
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
  );
}
