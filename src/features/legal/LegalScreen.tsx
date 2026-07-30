import Link from "next/link";
import { Clock, Mail } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { cn } from "@/src/shared/lib/cn";

export type LegalDocId = "terms" | "privacy";

/** The one inbox address for every legal document's contact treatment. */
const SUPPORT_EMAIL = "support@playvelanto.com";

export interface LegalSection {
  title: string;
  body: string;
  /**
   * Optional list rendered under {@link body}. Used where a section is an
   * enumeration rather than an argument — retention periods per data category,
   * the rights list, the processors. Splitting those out of the prose is what
   * keeps the documents readable by a 16-year-old, which GDPR Art. 12(1)
   * requires of a service that states a minimum age of 16.
   */
  bullets?: string[];
}

export interface LegalScreenProps {
  /** Which document is on screen — drives the toggle's active state. */
  activeDoc: LegalDocId;
  /** Label for the header's back-to-browse pill (shared `header` namespace). */
  browseLabel: string;
  heading: string;
  intro: string;
  /** e.g. "Last updated" — paired with {@link lastUpdated} for the date line. */
  lastUpdatedLabel: string;
  /** Locale-neutral date the document last changed, e.g. "2026-07-15". */
  lastUpdated: string;
  sections: LegalSection[];
  /** UI chrome (shared `legal` namespace) — labels for the doc-toggle. */
  termsTabLabel: string;
  privacyTabLabel: string;
  /** Heading for the sticky "on this page" section-jump nav. */
  onThisPageLabel: string;
  /** Title/note for the closing contact card. */
  questionsTitle: string;
  questionsNote: string;
}

/**
 * Turns a section title into a DOM-safe anchor id, mirroring the mock's own
 * `slug()`: lowercase, any run of non-alphanumerics becomes one hyphen, edge
 * hyphens trimmed. Non-Latin locales (ar/bn/hi/ru/ur/uk/zh) can slug down to
 * nothing since the pattern only keeps `[a-z0-9]` — falls back to a
 * position-based id so every section still gets a stable, unique anchor.
 */
function slugify(title: string, index: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `section-${index}`;
}

/**
 * Presentational shell for a legal document page (Terms, Privacy). Purely
 * string-driven so it stays trivially testable and reusable across documents;
 * each route resolves its own namespace(s) and passes the copy in.
 *
 * `/terms` and `/privacy` are separate routes, not a single hash-routed page —
 * the Terms/Privacy toggle is two real links between them (not client state),
 * so each document keeps its own URL/canonical/OpenGraph.
 */
export function LegalScreen({
  activeDoc,
  browseLabel,
  heading,
  intro,
  lastUpdatedLabel,
  lastUpdated,
  sections,
  termsTabLabel,
  privacyTabLabel,
  onThisPageLabel,
  questionsTitle,
  questionsNote,
}: LegalScreenProps) {
  const sectionIds = sections.map((section, index) =>
    slugify(section.title, index),
  );

  return (
    <>
      <PageHeader back={{ href: "/", label: browseLabel }} crumb={heading} />
      <main className="mx-auto w-full max-w-[1040px] px-6 py-12">
        <div className="mb-10 flex flex-col gap-5 min-[560px]:flex-row min-[560px]:items-start min-[560px]:justify-between">
          <div className="min-w-0">
            <Text as="h1" variant="title" className="mb-3 text-3xl">
              {heading}
            </Text>
            <Text
              variant="secondary"
              className="max-w-[62ch] text-base leading-relaxed"
            >
              {intro}
            </Text>
          </div>

          <div className="flex flex-none flex-col items-start gap-3 min-[560px]:items-end">
            <div
              role="group"
              aria-label={`${termsTabLabel} / ${privacyTabLabel}`}
              className="inline-flex gap-1 rounded-control border border-white/[0.08] bg-background p-[3px]"
            >
              <Link
                href="/terms"
                aria-current={activeDoc === "terms" ? "page" : undefined}
                className={cn(
                  "h-[34px] rounded-[9px] px-4 text-[13px] font-semibold leading-[34px] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                  activeDoc === "terms"
                    ? "bg-white/10 text-foreground"
                    : "text-white/50 hover:text-foreground-secondary",
                )}
              >
                {termsTabLabel}
              </Link>
              <Link
                href="/privacy"
                aria-current={activeDoc === "privacy" ? "page" : undefined}
                className={cn(
                  "h-[34px] rounded-[9px] px-4 text-[13px] font-semibold leading-[34px] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                  activeDoc === "privacy"
                    ? "bg-white/10 text-foreground"
                    : "text-white/50 hover:text-foreground-secondary",
                )}
              >
                {privacyTabLabel}
              </Link>
            </div>

            <Text
              as="span"
              variant="tertiary"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px]"
            >
              <Clock size={12} strokeWidth={2} aria-hidden />
              {lastUpdatedLabel}: {lastUpdated}
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 min-[900px]:grid-cols-[minmax(0,1fr)_250px] min-[900px]:items-start">
          <div className="flex min-w-0 flex-col gap-8">
            {sections.map((section, index) => (
              <section key={index} id={sectionIds[index]}>
                <Text as="h2" variant="title" className="mb-2 text-xl">
                  {section.title}
                </Text>
                <Text variant="secondary" className="text-base leading-relaxed">
                  {section.body}
                </Text>
                {section.bullets && (
                  <ul className="mt-3 flex list-disc flex-col gap-2 ps-6">
                    {section.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex}>
                        <Text
                          variant="secondary"
                          className="text-base leading-relaxed"
                        >
                          {bullet}
                        </Text>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {/* Additional visual treatment alongside the existing Contact
              section above — it does not replace that section's body copy. */}
            <Card className="flex items-start gap-4">
              <span
                aria-hidden
                className="grid h-10 w-10 flex-none place-items-center rounded-control bg-acc/[0.12] text-acc"
              >
                <Mail size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <Text as="h2" variant="title" className="mb-1.5 text-lg">
                  {questionsTitle}
                </Text>
                <Text
                  variant="secondary"
                  className="mb-2 text-sm leading-relaxed"
                >
                  {questionsNote}
                </Text>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-sm font-semibold text-acc hover:text-acc-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </Card>
          </div>

          <nav
            aria-label={onThisPageLabel}
            className="flex flex-col gap-0.5 min-[900px]:sticky min-[900px]:top-6"
          >
            <Text
              variant="tertiary"
              className="mb-1 ps-3 text-[11px] font-semibold tracking-[0.12em]"
            >
              {onThisPageLabel}
            </Text>
            {sections.map((section, index) => (
              <a
                key={index}
                href={`#${sectionIds[index]}`}
                className="truncate rounded-lg px-3 py-1.5 text-[13px] font-medium text-foreground-secondary transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </main>
    </>
  );
}
