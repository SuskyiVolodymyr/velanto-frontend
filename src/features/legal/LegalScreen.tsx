import { Text } from "@/src/shared/components/Text";

export interface LegalSection {
  title: string;
  body: string;
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
          </section>
        ))}
      </div>
    </main>
  );
}
