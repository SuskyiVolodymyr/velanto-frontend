import { Text } from "@/src/shared/components/Text";

export interface LegalScreenProps {
  heading: string;
  intro: string;
  /** Placeholder notice shown while the real legal copy is pending review. */
  draftNotice: string;
}

/**
 * Presentational shell for a legal document page (Terms, Privacy). Purely
 * string-driven so it stays trivially testable and reusable across documents;
 * each route resolves its own namespace and passes the copy in. The real legal
 * text is not written yet — `draftNotice` makes the placeholder status explicit.
 */
export function LegalScreen({ heading, intro, draftNotice }: LegalScreenProps) {
  return (
    <main className="mx-auto w-full max-w-[760px] px-6 py-12">
      <Text as="h1" variant="title" className="text-3xl mb-3">
        {heading}
      </Text>
      <Text variant="secondary" className="text-base leading-relaxed mb-6">
        {intro}
      </Text>
      <Text
        role="note"
        variant="secondary"
        className="rounded-[12px] border border-border bg-white/[0.03] px-4 py-3 text-sm"
      >
        {draftNotice}
      </Text>
    </main>
  );
}
