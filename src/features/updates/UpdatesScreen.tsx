"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { Card } from "@/src/shared/components/Card";
import { buttonClassName } from "@/src/shared/components/Button";
import { formatDate } from "@/src/shared/lib/format-date";
import { cn } from "@/src/shared/lib/cn";
import type { UpdateEntry } from "./updates-data";

/**
 * Cap on visible bullets per entry before a "Show N more" toggle takes over —
 * pinned to match the mock exactly. Not a magic number to tune.
 */
const PREVIEW_BULLETS = 4;

/** `href="#v{version-with-dashes}"`, matching the mock's `"v" + version.replace(/\./g, "-")`. */
function versionAnchor(version: string): string {
  return `v${version.replace(/\./g, "-")}`;
}

export interface UpdatesScreenProps {
  heading: string;
  intro: string;
  /** Shown in place of the list when there are no entries yet. */
  emptyLabel: string;
  entries: UpdateEntry[];
  /** Heading for the sticky releases rail. */
  releasesHeading: string;
  /** Pill label on the newest entry, e.g. "Latest". */
  latestLabel: string;
  /** Toggle label once an entry's bullets are fully expanded. */
  showLessLabel: string;
  /** Closing callout copy. */
  missingTitle: string;
  missingNote: string;
  openSuggestionsLabel: string;
  /** "N changes" / "1 change", formatted (and pluralized) by the caller. */
  formatChangesCount: (count: number) => string;
  /** "Show N more", formatted by the caller — `count` is always >= 1. */
  formatShowMore: (count: number) => string;
}

/**
 * Presentational changelog page. String-driven like {@link LegalScreen} so the
 * route resolves the locale and the component stays trivially testable. Sorts
 * newest-first here so the data file's authoring order isn't load-bearing.
 *
 * Client Component: each entry's bullet-list expansion is independent local
 * state (`open`, keyed by `version-date`), which a Server Component can't hold.
 */
export function UpdatesScreen({
  heading,
  intro,
  emptyLabel,
  entries,
  releasesHeading,
  latestLabel,
  showLessLabel,
  missingTitle,
  missingNote,
  openSuggestionsLabel,
  formatChangesCount,
  formatShowMore,
}: UpdatesScreenProps) {
  const ordered = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <main className="mx-auto w-full max-w-[1080px] px-6 py-12">
      <Text as="h1" variant="title" className="mb-3 text-3xl">
        {heading}
      </Text>
      <Text variant="secondary" className="mb-10 text-base leading-relaxed">
        {intro}
      </Text>

      {ordered.length === 0 ? (
        <Text variant="tertiary" className="text-base">
          {emptyLabel}
        </Text>
      ) : (
        <div className="grid grid-cols-1 gap-8 min-[900px]:grid-cols-[minmax(0,1fr)_210px] min-[900px]:items-start">
          <div className="flex flex-col">
            <div data-testid="updates-entries" className="flex flex-col">
              {ordered.map((entry, index) => {
              const entryKey = `${entry.version}-${entry.date}`;
              const isLatest = index === 0;
              const isLast = index === ordered.length - 1;
              const isOpen = open[entryKey] ?? false;
              const hiddenCount = entry.bullets.length - PREVIEW_BULLETS;
              const hasMore = hiddenCount > 0;
              const visibleBullets = isOpen
                ? entry.bullets
                : entry.bullets.slice(0, PREVIEW_BULLETS);

              return (
                <article
                  key={entryKey}
                  id={versionAnchor(entry.version)}
                  className="relative flex gap-5 pb-8"
                >
                  {/* Timeline spine + dot — hidden below ~620px, matching the mock. */}
                  <div
                    aria-hidden
                    className="hidden w-6 flex-none flex-col items-center min-[620px]:flex"
                  >
                    <span
                      className={cn(
                        "h-3 w-3 flex-none rounded-full",
                        isLatest
                          ? "bg-acc shadow-[0_0_0_4px_rgba(0,229,255,0.18)]"
                          : "bg-white/25",
                      )}
                    />
                    {!isLast && (
                      <span className="mt-1 w-px flex-1 bg-white/10" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 rounded-[15px] border border-border bg-surface p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <Badge variant="accent">v{entry.version}</Badge>
                      {isLatest && (
                        <Badge variant="default" className="text-acc-hover">
                          {latestLabel}
                        </Badge>
                      )}
                      <Text as="span" variant="tertiary" className="text-sm">
                        {formatDate(entry.date)}
                      </Text>
                      <Text
                        as="span"
                        variant="tertiary"
                        className="ms-auto text-xs"
                      >
                        {formatChangesCount(entry.bullets.length)}
                      </Text>
                    </div>
                    <Text as="h2" variant="title" className="mb-3 text-xl">
                      {entry.title}
                    </Text>
                    <ul className="flex list-disc flex-col gap-2 ps-6">
                      {visibleBullets.map((bullet, index) => (
                        <li key={index}>
                          <Text
                            variant="secondary"
                            className="text-base leading-relaxed"
                          >
                            {bullet}
                          </Text>
                        </li>
                      ))}
                    </ul>
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() =>
                          setOpen((prev) => ({
                            ...prev,
                            [entryKey]: !isOpen,
                          }))
                        }
                        className="mt-3 text-sm font-semibold text-acc hover:text-acc-hover"
                      >
                        {isOpen ? showLessLabel : formatShowMore(hiddenCount)}
                      </button>
                    )}
                  </div>
                </article>
              );
              })}
            </div>

            <Card className="flex items-start gap-4">
              <span
                aria-hidden
                className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-acc/[0.12] text-acc"
              >
                <Lightbulb size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <Text as="h2" variant="title" className="mb-1.5 text-lg">
                  {missingTitle}
                </Text>
                <Text
                  variant="secondary"
                  className="mb-3 text-sm leading-relaxed"
                >
                  {missingNote}
                </Text>
                <Link href="/feedback" className={buttonClassName("secondary")}>
                  {openSuggestionsLabel}
                </Link>
              </div>
            </Card>
          </div>

          <nav
            aria-label={releasesHeading}
            className="flex flex-col gap-0.5 min-[900px]:sticky min-[900px]:top-[80px]"
          >
            <Text
              variant="tertiary"
              className="mb-1 ps-3 text-[11px] font-semibold tracking-[0.12em]"
            >
              {releasesHeading}
            </Text>
            {ordered.map((entry) => (
              <a
                key={entry.version}
                href={`#${versionAnchor(entry.version)}`}
                className="truncate rounded-lg px-3 py-1.5 font-mono text-[13px] font-medium text-foreground-secondary transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                v{entry.version}
              </a>
            ))}
          </nav>
        </div>
      )}
    </main>
  );
}
