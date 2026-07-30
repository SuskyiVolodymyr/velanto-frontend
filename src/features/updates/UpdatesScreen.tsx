"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { Card } from "@/src/shared/components/Card";
import { buttonClassName } from "@/src/shared/components/Button";
import { PageHeader } from "@/src/shared/components/PageHeader";
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
  /** Label for the header's back-to-browse pill (shared `header` namespace). */
  browseLabel: string;
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
  /** Header's trailing "Docs" link label (shared `header` namespace). */
  docsLabel: string;
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
  browseLabel,
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
  docsLabel,
}: UpdatesScreenProps) {
  // Pluralized ICU messages ("N changes" / "Show N more") — resolved here
  // rather than passed in as formatter functions from the server page, since
  // functions can't cross the Server→Client Component boundary (#UpdatesScreen
  // is "use client"; the rest of this component's copy is plain strings,
  // which are serializable, so only these two moved).
  const t = useTranslations("updates");
  const ordered = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <>
      <PageHeader
        back={{ href: "/", label: browseLabel }}
        crumb={heading}
        trailing={
          <Link
            href="/docs"
            className="flex h-[38px] items-center rounded-[11px] border border-white/[0.12] px-[14px] text-[13px] font-semibold text-foreground transition-colors hover:bg-white/[0.06]"
          >
            {docsLabel}
          </Link>
        }
      />
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

                      {/* `cn()` is a plain join (not tailwind-merge, see Button.tsx),
                      so this deliberately doesn't pass a `p-*` override — that
                      would sit alongside Card's own `p-[18px]` with the winner
                      decided by Tailwind's emit order, not source order. */}
                      <Card className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-3">
                          <Badge variant="accent">v{entry.version}</Badge>
                          {isLatest && (
                            <Badge variant="default" className="text-acc-hover">
                              {latestLabel}
                            </Badge>
                          )}
                          <Text
                            as="span"
                            variant="tertiary"
                            className="text-sm"
                          >
                            {formatDate(entry.date)}
                          </Text>
                          <Text
                            as="span"
                            variant="tertiary"
                            className="ms-auto text-xs"
                          >
                            {t("changesCount", { count: entry.bullets.length })}
                          </Text>
                        </div>
                        <Text as="h2" variant="title" className="mb-3 text-xl">
                          {entry.title}
                        </Text>
                        <ul
                          id={`${entryKey}-bullets`}
                          className="flex list-disc flex-col gap-2 ps-6"
                        >
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
                            aria-expanded={isOpen}
                            aria-controls={`${entryKey}-bullets`}
                            onClick={() =>
                              setOpen((prev) => ({
                                ...prev,
                                [entryKey]: !isOpen,
                              }))
                            }
                            className="mt-3 text-sm font-semibold text-acc hover:text-acc-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
                          >
                            {isOpen
                              ? showLessLabel
                              : t("showMore", { count: hiddenCount })}
                          </button>
                        )}
                      </Card>
                    </article>
                  );
                })}
              </div>

              <Card className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="grid h-10 w-10 flex-none place-items-center rounded-control bg-acc/[0.12] text-acc"
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
                  <Link
                    href="/feedback"
                    className={buttonClassName("secondary")}
                  >
                    {openSuggestionsLabel}
                  </Link>
                </div>
              </Card>
            </div>

            <nav
              aria-label={releasesHeading}
              className="flex flex-col gap-0.5 min-[900px]:sticky min-[900px]:top-6"
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
                  className="truncate rounded-lg px-3 py-1.5 font-mono text-[13px] font-medium text-foreground-secondary transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
                >
                  v{entry.version}
                </a>
              ))}
            </nav>
          </div>
        )}
      </main>
    </>
  );
}
