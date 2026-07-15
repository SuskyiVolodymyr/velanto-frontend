"use client";

import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

export type TopicId = "start" | "creating" | "formats" | "playing" | "stats";

interface NavSection {
  label: string;
  topics: { id: TopicId; label: string }[];
}

const NAV: NavSection[] = [
  { label: "OVERVIEW", topics: [{ id: "start", label: "Getting started" }] },
  {
    label: "CREATORS",
    topics: [
      { id: "creating", label: "Creating a pack" },
      { id: "formats", label: "Formats explained" },
    ],
  },
  {
    label: "PLAYERS",
    topics: [
      { id: "playing", label: "Playing packs" },
      { id: "stats", label: "Stats & comparisons" },
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
  return (
    <nav className="flex w-full flex-col gap-6 md:sticky md:top-[80px] md:w-[220px] md:flex-none">
      {NAV.map((section) => (
        <div key={section.label}>
          <Text
            variant="tertiary"
            className="mb-2 pl-3 text-[11px] font-semibold tracking-[0.12em]"
          >
            {section.label}
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
                  {topic.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
