import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import type { RulesDocument } from "@/src/features/rules/get-rules-server";

export interface RulesScreenProps {
  /** Fetched rules, or `null` when the server fetch failed. */
  rules: RulesDocument | null;
}

/**
 * Presentational (non-async) render of the Community Rules. Kept separate from
 * the route so it stays testable with React Testing Library. `null` rules
 * render a graceful error state instead of crashing the page.
 */
export function RulesScreen({ rules }: RulesScreenProps) {
  const t = useTranslations("rules");

  return (
    <main className="mx-auto w-full max-w-[760px] px-6 py-12">
      <Text as="h1" variant="title" className="text-3xl mb-3">
        {t("heading")}
      </Text>
      <Text variant="secondary" className="text-base leading-relaxed mb-10">
        {t("intro")}
      </Text>

      {rules === null ? (
        <Text role="alert" className="text-sm text-[#ff6b6b]">
          {t("loadError")}
        </Text>
      ) : (
        <div className="flex flex-col gap-10">
          {rules.categories.map((category) => (
            <section key={category.id} aria-labelledby={`rules-cat-${category.id}`}>
              <Text
                as="h2"
                id={`rules-cat-${category.id}`}
                variant="title"
                className="text-xl mb-4"
              >
                {category.title}
              </Text>
              <ol className="flex flex-col gap-3">
                {category.rules.map((rule) => (
                  <li key={rule.number} className="flex gap-3">
                    <span
                      aria-hidden
                      className="shrink-0 font-mono text-sm text-foreground-tertiary tabular-nums pt-0.5"
                    >
                      {rule.number}.
                    </span>
                    <Text variant="body" className="text-[15px] leading-relaxed">
                      {rule.text}
                    </Text>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
