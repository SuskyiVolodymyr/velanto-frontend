import Link from "next/link";
import { Clock, Mail } from "lucide-react";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { cn } from "@/src/shared/lib/cn";
import { pageContainer } from "@/src/shared/lib/page-container";

export type LegalDocId = "terms" | "privacy";

/** The one inbox address for every legal document's contact treatment. */
const SUPPORT_EMAIL = "support@playvelanto.com";

/** One segment of the header's Terms/Privacy switch (mock: 32px, 8px radius). */
const TAB_CLASS =
  "h-8 rounded-lg px-3.5 text-[12.5px] font-[650] leading-8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc";

function tabTone(active: boolean): string {
  return active
    ? "bg-white/10 text-foreground"
    : "text-white/50 hover:text-foreground-secondary";
}

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
  /** Pluralized "N sections" line beside the last-updated chip. */
  sectionCountLabel: string;
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
  sectionCountLabel,
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
      <PageHeader
        back={{ href: "/", label: browseLabel }}
        // Terms and Privacy link to each other, so either can be the origin;
        // the current page can never be its own previous path.
        backFrom={["dashboard", "terms", "privacy"]}
        crumb={heading}
        // Mock: the Terms/Privacy switch lives in the header bar, not in the
        // page body — it belongs to the pair of documents rather than to
        // either one's prose.
        trailing={
          <div
            role="group"
            aria-label={`${termsTabLabel} / ${privacyTabLabel}`}
            className="inline-flex gap-1 rounded-[11px] border border-white/[0.08] bg-white/[0.04] p-1"
          >
            <Link
              href="/terms"
              aria-current={activeDoc === "terms" ? "page" : undefined}
              className={cn(TAB_CLASS, tabTone(activeDoc === "terms"))}
            >
              {termsTabLabel}
            </Link>
            <Link
              href="/privacy"
              aria-current={activeDoc === "privacy" ? "page" : undefined}
              className={cn(TAB_CLASS, tabTone(activeDoc === "privacy"))}
            >
              {privacyTabLabel}
            </Link>
          </div>
        }
      />
      <main className={cn(pageContainer(1320), "pb-20 pt-8")}>
        <div className="grid grid-cols-1 items-start gap-9 min-[900px]:grid-cols-[minmax(0,1fr)_250px]">
          <article className="flex min-w-0 flex-col">
            <h1 className="mb-3 text-[32px] font-bold leading-tight tracking-[-0.025em] text-foreground">
              {heading}
            </h1>
            <p className="mb-2.5 text-[15.5px] leading-[1.7] text-pretty text-foreground-secondary">
              {intro}
            </p>
            <div className="mb-[34px] flex flex-wrap items-center gap-[9px]">
              <span className="inline-flex items-center gap-[7px] rounded-lg border border-white/[0.08] bg-white/[0.05] px-[11px] py-[5px] font-mono text-xs text-foreground-secondary">
                <Clock size={12} strokeWidth={2} aria-hidden />
                {lastUpdatedLabel}: {lastUpdated}
              </span>
              <span className="text-xs text-foreground-tertiary">
                {sectionCountLabel}
              </span>
            </div>

            <div className="flex flex-col gap-8">
              {sections.map((section, index) => (
                <section
                  key={index}
                  id={sectionIds[index]}
                  className="flex scroll-mt-[88px] flex-col gap-2.5"
                >
                  <h2 className="text-xl font-bold tracking-[-0.015em] text-pretty text-foreground">
                    {section.title}
                  </h2>
                  <p className="text-[15px] leading-[1.75] text-pretty text-foreground-secondary">
                    {section.body}
                  </p>
                  {section.bullets && (
                    <ul className="mt-1.5 flex flex-col gap-2.5">
                      {section.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex} className="flex gap-[11px]">
                          <span
                            aria-hidden
                            className="mt-[9px] h-[5px] w-[5px] flex-none rounded-full bg-acc/60"
                          />
                          <span className="text-[14.5px] leading-[1.7] text-pretty text-foreground-secondary">
                            {bullet}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {/* Additional visual treatment alongside the existing Contact
              section above — it does not replace that section's body copy. */}
            <div className="mt-[38px] flex flex-wrap items-center gap-3 rounded-[16px] border border-border bg-surface-card p-[18px]">
              <span
                aria-hidden
                className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-acc/10 text-acc"
              >
                <Mail size={18} strokeWidth={1.9} />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                {/* Styled as the mock's plain label, but kept a real heading —
                    it names a landmark block in the document outline. */}
                <h2 className="text-[13.5px] font-[650] text-foreground">
                  {questionsTitle}
                </h2>
                <span className="text-[12.5px] text-foreground-tertiary">
                  {questionsNote}
                </span>
              </div>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="ms-auto flex-none text-[13px] font-[650] text-acc hover:text-acc-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </article>

          {/* Scrolls independently once the list outgrows the viewport — the
              privacy policy has enough sections that a plain sticky nav would
              run off the bottom of the screen with no way to reach the rest. */}
          <nav
            aria-label={onThisPageLabel}
            className="flex flex-col gap-[3px] pe-1 min-[900px]:sticky min-[900px]:top-[88px] min-[900px]:max-h-[calc(100vh-110px)] min-[900px]:overflow-y-auto"
          >
            <span className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground-tertiary">
              {onThisPageLabel}
            </span>
            {sections.map((section, index) => (
              <a
                key={index}
                href={`#${sectionIds[index]}`}
                className="rounded-lg px-2.5 py-[7px] text-[12.5px] font-medium leading-[1.4] text-foreground-secondary transition-colors hover:bg-white/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
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
