"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search as SearchIcon, X as ClearIcon } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { SearchField } from "@/src/shared/components/SearchField";
import { EmptyState } from "@/src/shared/components/EmptyState";
import { Card } from "@/src/shared/components/Card";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { cn } from "@/src/shared/lib/cn";
import type { RulesDocument } from "@/src/features/rules/get-rules-server";

export interface RulesScreenProps {
  /** Fetched rules, or `null` when the server fetch failed. */
  rules: RulesDocument | null;
}

/**
 * Localized rule text, keyed by the backend's stable category id. The backend
 * (`GET /rules`) stays the canonical source of the taxonomy — category ids,
 * order, and `version` — but the display *prose* is presentation content and
 * lives in the next-intl catalogs (`rules.content`), like every other string in
 * the app. Read raw (not through ICU) since the text has no placeholders and is
 * full of apostrophes that MessageFormat would otherwise treat as escapes.
 */
type RulesContent = Record<
  string,
  { title?: string; items?: Record<string, string> }
>;

interface DisplayRule {
  number: number;
  text: string;
}

interface DisplayCategory {
  id: string;
  title: string;
  rules: DisplayRule[];
}

/** Case-insensitive substring match, mirroring the mock's `matches()`. */
function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Presentational (non-async) render of the Community Rules. Kept separate from
 * the route so it stays testable with React Testing Library. `null` rules
 * render a graceful error state instead of crashing the page.
 *
 * Each category's title and rule text prefers the localized catalog entry for
 * its id, falling back to the backend-supplied English when the catalog has no
 * translation for that id/number — so a category added on the backend degrades
 * to English rather than breaking the page.
 *
 * Client Component: the search box needs interactive state (query + per-render
 * filtering), which a Server Component can't hold.
 */
export function RulesScreen({ rules }: RulesScreenProps) {
  const t = useTranslations("rules");
  const content: RulesContent = t.has("content")
    ? (t.raw("content") as RulesContent)
    : {};
  const [query, setQuery] = useState("");

  const categories: DisplayCategory[] = useMemo(() => {
    if (!rules) return [];
    return rules.categories.map((category) => ({
      id: category.id,
      title: content[category.id]?.title ?? category.title,
      rules: category.rules.map((rule) => ({
        number: rule.number,
        text: content[category.id]?.items?.[String(rule.number)] ?? rule.text,
      })),
    }));
  }, [rules, content]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  // A category with zero matching rules is hidden entirely, mirroring the
  // mock's `cats.filter(c => c.visible.length > 0)`.
  const visibleCategories = useMemo(() => {
    if (!hasQuery) return categories;
    return categories
      .map((category) => ({
        ...category,
        rules: category.rules.filter((rule) => matches(rule.text, trimmedQuery)),
      }))
      .filter((category) => category.rules.length > 0);
  }, [categories, hasQuery, trimmedQuery]);

  const noMatches = hasQuery && visibleCategories.length === 0;

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <Text as="h1" variant="title" className="text-3xl mb-3">
        {t("heading")}
      </Text>
      <Text variant="secondary" className="text-base leading-relaxed mb-8">
        {t("intro")}
      </Text>

      {rules !== null && (
        <div className="relative mb-10 max-w-[420px]">
          <SearchField
            type="search"
            aria-label={t("searchPlaceholder")}
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={hasQuery ? "pe-9" : undefined}
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("clearSearch")}
              className="absolute end-3 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full text-foreground-tertiary transition-colors hover:text-foreground"
            >
              <ClearIcon size={14} aria-hidden />
            </button>
          )}
        </div>
      )}

      {rules === null ? (
        <Text variant="danger" role="alert" className="text-sm">
          {t("loadError")}
        </Text>
      ) : (
        <div className="grid grid-cols-1 gap-8 min-[940px]:grid-cols-[minmax(0,232px)_minmax(0,1fr)] min-[940px]:items-start">
          <nav
            aria-label={t("categoriesHeading")}
            className="flex flex-col gap-4 min-[940px]:sticky min-[940px]:top-[80px]"
          >
            <div className="flex flex-col gap-0.5">
              <Text
                variant="tertiary"
                className="mb-1 ps-3 text-[11px] font-semibold tracking-[0.12em]"
              >
                {t("categoriesHeading")}
              </Text>
              {categories.map((category, index) => (
                <a
                  key={category.id}
                  href={`#rules-cat-${category.id}`}
                  className="flex items-baseline gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:text-foreground hover:bg-white/[0.06]"
                >
                  <span
                    aria-hidden
                    className="font-mono text-xs text-foreground-tertiary tabular-nums"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {category.title}
                </a>
              ))}
            </div>

            <Card className="p-4">
              <Text as="h3" variant="title" className="mb-1.5 text-sm">
                {t("reportTitle")}
              </Text>
              <Text variant="tertiary" className="text-[12.5px] leading-relaxed">
                {t("reportNote")}
              </Text>
            </Card>
          </nav>

          <div className="flex min-w-0 flex-col gap-10">
            {noMatches ? (
              <EmptyState
                icon={<SearchIcon size={18} aria-hidden />}
                title={t("noMatch", { query: trimmedQuery })}
                description={t("tryPlainer")}
                action={
                  <Button variant="secondary" onClick={() => setQuery("")}>
                    {t("clearSearch")}
                  </Button>
                }
              />
            ) : (
              visibleCategories.map((category) => (
                <section
                  key={category.id}
                  aria-labelledby={`rules-cat-${category.id}`}
                >
                  <Text
                    as="h2"
                    id={`rules-cat-${category.id}`}
                    variant="title"
                    className="text-xl mb-4"
                  >
                    {category.title}
                  </Text>
                  <ol className="flex flex-col gap-3">
                    {category.rules.map((rule) => {
                      const isMatch = hasQuery && matches(rule.text, trimmedQuery);
                      return (
                        <li
                          key={rule.number}
                          className={cn(
                            "flex gap-3 rounded-lg p-2 -m-2",
                            isMatch && "bg-acc/[0.08] ring-1 ring-acc/30",
                          )}
                        >
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
                      );
                    })}
                  </ol>
                </section>
              ))
            )}

            <Card className="text-center">
              <Text as="h2" variant="title" className="mb-1.5 text-lg">
                {t("wrongRuleTitle")}
              </Text>
              <Text
                variant="secondary"
                className="mx-auto mb-4 max-w-[52ch] text-sm leading-relaxed"
              >
                {t("wrongRuleNote")}
              </Text>
              <Link href="/feedback" className={buttonClassName("secondary")}>
                {t("openSuggestions")}
              </Link>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}
