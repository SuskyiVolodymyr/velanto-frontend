"use client";

import { useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { cn } from "@/src/shared/lib/cn";

type TopicId = "start" | "creating" | "formats" | "playing" | "stats";

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

const FORMAT_DOCS = [
  {
    name: "Save One",
    desc: "A pool of items appears; you save exactly one and the rest are dropped for that round.",
  },
  {
    name: "Sacrifice One",
    desc: "The reverse of Save One — remove one item at a time from a group until a single favorite remains.",
  },
  {
    name: "Rank Blind",
    desc: "Items appear one at a time in an unknown order; you slot each into a running ranked list as it appears.",
  },
  {
    name: "NxN",
    desc: "Two or more categories are shown side by side; you pick a whole side to advance, round after round.",
  },
  {
    name: "1v1",
    desc: "Straight pairwise comparisons, one match at a time — no bracket, just a sequence of head-to-heads.",
  },
];

export function DocsScreen() {
  const [activeTopic, setActiveTopic] = useState<TopicId>("start");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 gap-11 px-7 py-10">
      <nav className="flex w-[220px] flex-none flex-col gap-6">
        {NAV.map((section) => (
          <div key={section.label}>
            <Text variant="tertiary" className="mb-2 pl-3 text-[11px] font-semibold tracking-[0.12em]">
              {section.label}
            </Text>
            <div className="flex flex-col gap-0.5">
              {section.topics.map((topic) => {
                const active = topic.id === activeTopic;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setActiveTopic(topic.id)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                      active ? "bg-white/[0.08] text-foreground" : "text-foreground-secondary",
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

      <article className="min-w-0 max-w-2xl flex-1">
        {activeTopic === "start" && (
          <>
            <Text as="h1" variant="title" className="mb-3 text-3xl">
              What is Velanto?
            </Text>
            <Text variant="secondary" className="mb-4 leading-7">
              Velanto is a builder for elimination-style quizzes, called packs. A creator picks a
              topic and one of five elimination formats, adds items, and publishes. Anyone can
              play a pack as many times as they like — every playthrough draws a fresh sample, so
              no two runs are quite the same.
            </Text>
            <Text variant="secondary" className="mb-7 leading-7">
              Play is always blind: you never see how anyone else picked until you finish. Once
              you&apos;re done, stats unlock — popular choices, agreement rates, and how your
              result compares to everyone else who&apos;s played.
            </Text>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { title: "Build a pack", body: "Pick a format, add items or tag pools, set rounds." },
                { title: "Play blind", body: "No influence from other players' choices." },
                { title: "Compare after", body: "Stats unlock only once you've finished." },
              ].map((card) => (
                <Card key={card.title} className="hover:translate-y-0 hover:shadow-none">
                  <Text className="mb-1.5 font-semibold">{card.title}</Text>
                  <Text variant="tertiary" className="text-sm leading-6">
                    {card.body}
                  </Text>
                </Card>
              ))}
            </div>
          </>
        )}

        {activeTopic === "creating" && (
          <>
            <Text as="h1" variant="title" className="mb-3 text-3xl">
              Creating a pack
            </Text>
            <Text variant="secondary" className="mb-4 leading-7">
              Every pack pairs a topic with exactly one elimination format. Items can be added two
              ways, and you can freely mix both inside the same pack:
            </Text>
            <ul className="mb-4 list-disc pl-5">
              <li className="mb-2">
                <Text as="span" className="font-semibold">
                  Fixed items
                </Text>
                <Text as="span" variant="secondary">
                  {" "}
                  — specific entries that always show up.
                </Text>
              </li>
              <li>
                <Text as="span" className="font-semibold">
                  Tag pools
                </Text>
                <Text as="span" variant="secondary">
                  {" "}
                  — tag items (year, genre, whatever) and a round pulls N random items sharing
                  that tag.
                </Text>
              </li>
            </ul>
            <Text variant="secondary" className="leading-7">
              Items can be text, an image upload, or a YouTube link — each with a title. Once your
              items and rounds are set, publish.
            </Text>
          </>
        )}

        {activeTopic === "formats" && (
          <>
            <Text as="h1" variant="title" className="mb-5 text-3xl">
              The five formats
            </Text>
            <div className="flex flex-col gap-3">
              {FORMAT_DOCS.map((format) => (
                <Card key={format.name} className="hover:translate-y-0 hover:shadow-none">
                  <Text className="mb-1.5 font-semibold">{format.name}</Text>
                  <Text variant="secondary" className="text-sm leading-6">
                    {format.desc}
                  </Text>
                </Card>
              ))}
            </div>
          </>
        )}

        {activeTopic === "playing" && (
          <>
            <Text as="h1" variant="title" className="mb-3 text-3xl">
              Playing a pack
            </Text>
            <Text variant="secondary" className="mb-4 leading-7">
              Open any pack and press Play. You&apos;ll go round by round following the logic of
              its format — save one, rank blind, eliminate — with no visibility into how anyone
              else played. At the end you get a personal artifact: a final ranking, a favorite, or
              a saved set, depending on the format.
            </Text>
            <Text variant="secondary" className="leading-7">
              You can replay any pack as many times as you like — tag pools resample randomly each
              run, so the experience isn&apos;t identical twice.
            </Text>
          </>
        )}

        {activeTopic === "stats" && (
          <>
            <Text as="h1" variant="title" className="mb-3 text-3xl">
              Stats &amp; comparisons
            </Text>
            <Text variant="secondary" className="leading-7">
              Stats stay locked while you&apos;re playing so nobody&apos;s choices are influenced
              by the crowd. Once you finish, you&apos;ll see popular picks, percent agreement, and
              how rare or common your result was among everyone who&apos;s played that pack.
            </Text>
          </>
        )}
      </article>
    </div>
  );
}
