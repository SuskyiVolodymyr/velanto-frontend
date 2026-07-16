import { Text } from "@/src/shared/components/Text";

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
  heading: string;
  intro: string;
  /** e.g. "Last updated" — paired with {@link lastUpdated} for the date line. */
  lastUpdatedLabel: string;
  /** Locale-neutral date the document last changed, e.g. "2026-07-15". */
  lastUpdated: string;
  sections: LegalSection[];
}

/**
 * Presentational shell for a legal document page (Terms, Privacy). Purely
 * string-driven so it stays trivially testable and reusable across documents;
 * each route resolves its own namespace and passes the copy in.
 */
export function LegalScreen({
  heading,
  intro,
  lastUpdatedLabel,
  lastUpdated,
  sections,
}: LegalScreenProps) {
  return (
    <main className="mx-auto w-full max-w-[760px] px-6 py-12">
      <Text as="h1" variant="title" className="mb-3 text-3xl">
        {heading}
      </Text>
      <Text variant="secondary" className="mb-2 text-base leading-relaxed">
        {intro}
      </Text>
      <Text variant="tertiary" className="mb-8 text-sm">
        {lastUpdatedLabel}: {lastUpdated}
      </Text>

      <div className="flex flex-col gap-8">
        {sections.map((section, index) => (
          <section key={index}>
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
      </div>
    </main>
  );
}
