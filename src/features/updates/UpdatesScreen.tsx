"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { formatDate } from "@/src/shared/lib/format-date";
import { cn } from "@/src/shared/lib/cn";
import type { UpdateEntry } from "./updates-data";
import { pageContainer } from "@/src/shared/lib/page-container";

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
      <main className={cn(pageContainer(1320), "pb-20 pt-8")}>
        <div className="grid grid-cols-1 items-start gap-9 min-[900px]:grid-cols-[minmax(0,1fr)_210px]">
          <div className="flex min-w-0 flex-col">
            <h1 className="mb-3 text-[32px] font-bold leading-tight tracking-[-0.025em] text-foreground">
              {heading}
            </h1>
            <p className="mb-7 text-[15.5px] leading-[1.7] text-pretty text-foreground-secondary">
              {intro}
            </p>

            {ordered.length === 0 ? (
              <Text variant="tertiary" className="text-base">
                {emptyLabel}
              </Text>
            ) : (
              <>
                <div data-testid="updates-entries" className="flex flex-col">
                  {ordered.map((entry, index) => {
                    const entryKey = `${entry.version}-${entry.date}`;
                    const isLatest = index === 0;
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
                        // Not a card: the mock reads each release as a plain
                        // block hung off a timeline, so nothing boxes the
                        // prose. The 30px inset is the spine's gutter, and it
                        // collapses (with the spine) below 620px.
                        className="relative flex scroll-mt-[88px] flex-col gap-3 pb-[30px] ps-[30px] max-[619px]:ps-0"
                      >
                        <span
                          aria-hidden
                          className="absolute bottom-0 start-[9px] top-[26px] w-[1.5px] bg-white/[0.08] max-[619px]:hidden"
                        />
                        <span
                          aria-hidden
                          className={cn(
                            "absolute start-0 top-1.5 h-[19px] w-[19px] rounded-full border-2 border-background max-[619px]:hidden",
                            isLatest
                              ? "bg-acc shadow-[0_0_0_3px_rgba(0,229,255,0.16)]"
                              : "bg-white/25",
                          )}
                        />

                        <div className="flex flex-wrap items-center gap-2.5">
                          <span
                            className={cn(
                              "rounded-lg border px-2.5 py-1 font-mono text-xs font-bold",
                              isLatest
                                ? "border-acc/30 bg-acc/10 text-acc"
                                : "border-white/10 bg-white/[0.05] text-foreground-secondary",
                            )}
                          >
                            v{entry.version}
                          </span>
                          <span className="font-mono text-[12.5px] text-foreground-tertiary">
                            {formatDate(entry.date)}
                          </span>
                          {isLatest && (
                            <span className="rounded-pill bg-acc/[0.16] px-2.5 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.05em] text-acc-hover">
                              {latestLabel}
                            </span>
                          )}
                          <span className="ms-auto text-[11.5px] text-foreground-tertiary">
                            {t("changesCount", { count: entry.bullets.length })}
                          </span>
                        </div>

                        <h2 className="text-[21px] font-bold tracking-[-0.015em] text-pretty text-foreground">
                          {entry.title}
                        </h2>

                        <ul
                          id={`${entryKey}-bullets`}
                          className="mt-0.5 flex flex-col gap-[11px]"
                        >
                          {visibleBullets.map((bullet, bulletIndex) => (
                            <li key={bulletIndex} className="flex gap-[11px]">
                              <span
                                aria-hidden
                                className="mt-[9px] h-[5px] w-[5px] flex-none rounded-full bg-acc/55"
                              />
                              <span className="text-[14.5px] leading-[1.7] text-pretty text-foreground-secondary">
                                {bullet}
                              </span>
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
                            className="mt-0.5 h-9 self-start rounded-[10px] border border-white/[0.12] px-3.5 text-[12.5px] font-[650] text-foreground-secondary transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
                          >
                            {isOpen
                              ? showLessLabel
                              : t("showMore", { count: hiddenCount })}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[16px] border border-border bg-surface-card p-[18px]">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[rgba(255,92,192,0.12)] text-[#FF8BD1]"
                  >
                    <Lightbulb size={18} strokeWidth={1.9} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="text-[13.5px] font-[650] text-foreground">
                      {missingTitle}
                    </h2>
                    <span className="text-[12.5px] text-foreground-tertiary">
                      {missingNote}
                    </span>
                  </div>
                  <Link
                    href="/feedback"
                    className={cn(
                      buttonClassName("primary"),
                      "ms-auto flex-none",
                    )}
                  >
                    {openSuggestionsLabel}
                  </Link>
                </div>
              </>
            )}
          </div>

          <nav
            aria-label={releasesHeading}
            className="flex flex-col gap-[3px] min-[900px]:sticky min-[900px]:top-[88px]"
          >
            <span className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground-tertiary">
              {releasesHeading}
            </span>
            {ordered.map((entry) => (
              <a
                key={entry.version}
                href={`#${versionAnchor(entry.version)}`}
                className="flex items-baseline gap-2.5 rounded-lg px-2.5 py-[7px] text-foreground-secondary transition-colors hover:bg-white/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
              >
                <span className="flex-none font-mono text-xs font-[650]">
                  v{entry.version}
                </span>
                <span className="truncate text-[11.5px] leading-[1.35] text-foreground-tertiary">
                  {formatDate(entry.date)}
                </span>
              </a>
            ))}
          </nav>
        </div>
      </main>
    </>
  );
}
