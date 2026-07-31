"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search as SearchIcon,
  ShieldCheck,
  X as ClearIcon,
} from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { SearchField } from "@/src/shared/components/SearchField";
import { EmptyState } from "@/src/shared/components/EmptyState";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { cn } from "@/src/shared/lib/cn";
import type { RulesDocument } from "@/src/features/rules/get-rules-server";
import { ruleCategoryTone } from "@/src/features/rules/rule-category-tone";
import { pageContainer } from "@/src/shared/lib/page-container";

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

/** Stable fallback so `content` never changes identity when the catalog has
 *  no `rules.content` — a fresh `{}` on every render would defeat the
 *  `categories` useMemo below. */
const EMPTY_CONTENT: RulesContent = {};

export function RulesScreen({ rules }: RulesScreenProps) {
  const t = useTranslations("rules");
  const th = useTranslations("header");
  const content: RulesContent = t.has("content")
    ? (t.raw("content") as RulesContent)
    : EMPTY_CONTENT;
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
        rules: category.rules.filter((rule) =>
          matches(rule.text, trimmedQuery),
        ),
      }))
      .filter((category) => category.rules.length > 0);
  }, [categories, hasQuery, trimmedQuery]);

  const noMatches = hasQuery && visibleCategories.length === 0;

  return (
    <>
      <PageHeader
        back={{ href: "/", label: th("browse") }}
        trailing={
          rules && (
            <span
              data-mono="1"
              className="text-[11.5px] text-foreground-tertiary"
            >
              v{rules.version}
            </span>
          )
        }
      />
      <main
        className={cn(
          pageContainer(1320),
          "flex flex-col gap-[26px] pb-[90px] pt-7",
        )}
      >
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-acc/[0.12] text-acc-hover"
            >
              <ShieldCheck size={22} strokeWidth={1.8} />
            </span>
            <h1 className="text-[30px] font-bold leading-tight tracking-[-0.025em] text-foreground">
              {t("heading")}
            </h1>
          </div>
          <p className="max-w-[68ch] text-[15px] leading-[1.6] text-pretty text-foreground-secondary">
            {t("intro")}
          </p>

          {rules !== null && (
            <div className="relative max-w-[420px]">
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
                  className="absolute end-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-[7px] bg-white/[0.07] text-foreground-tertiary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
                >
                  <ClearIcon size={12} strokeWidth={2.4} aria-hidden />
                </button>
              )}
            </div>
          )}
        </section>

        {rules === null ? (
          <Text variant="danger" role="alert" className="text-sm">
            {t("loadError")}
          </Text>
        ) : (
          <div className="grid grid-cols-1 items-start gap-[26px] min-[940px]:grid-cols-[minmax(0,232px)_minmax(0,1fr)]">
            <nav
              aria-label={t("categoriesHeading")}
              className="flex flex-col gap-[11px] min-[940px]:sticky min-[940px]:top-20"
            >
              <span className="px-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground-tertiary">
                {t("categoriesHeading")}
              </span>
              {/* Sourced from visibleCategories (not the full categories list) so
                a jump-link is never advertised for a category the active
                search has hidden — renumbered within the filtered set. Wraps
                into rows below the two-column breakpoint, where the nav sits
                above the rules as a strip rather than beside them. */}
              <div className="flex flex-wrap gap-[3px] min-[940px]:flex-col min-[940px]:flex-nowrap">
                {visibleCategories.map((category, index) => (
                  <a
                    key={category.id}
                    href={`#rules-cat-${category.id}`}
                    className="flex items-center gap-2.5 rounded-[10px] px-[11px] py-[9px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:bg-white/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
                  >
                    <span
                      aria-hidden
                      className="font-mono text-[11px] tabular-nums text-foreground-tertiary"
                    >
                      {index + 1}
                    </span>
                    {category.title}
                  </a>
                ))}
              </div>

              <div className="mt-2 flex flex-col gap-2 rounded-[14px] border border-border bg-surface-card p-3.5">
                <h2 className="text-[12.5px] font-[650] text-foreground">
                  {t("reportTitle")}
                </h2>
                <span className="text-[11.5px] leading-[1.5] text-pretty text-foreground-tertiary">
                  {t("reportNote")}
                </span>
              </div>
            </nav>

            <div className="flex min-w-0 flex-col gap-[30px]">
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
                visibleCategories.map((category) => {
                  const { Icon, tile } = ruleCategoryTone(category.id);
                  return (
                    <section
                      key={category.id}
                      aria-labelledby={`rules-cat-${category.id}`}
                      className="flex scroll-mt-[86px] flex-col gap-[13px]"
                    >
                      <div className="flex items-center gap-[11px]">
                        <span
                          aria-hidden
                          className={cn(
                            "grid h-8 w-8 flex-none place-items-center rounded-[10px]",
                            tile,
                          )}
                        >
                          <Icon size={16} strokeWidth={1.9} />
                        </span>
                        <h2
                          id={`rules-cat-${category.id}`}
                          className="text-[19px] font-bold tracking-[-0.015em] text-foreground"
                        >
                          {category.title}
                        </h2>
                        <span className="ms-auto font-mono text-[11.5px] text-foreground-tertiary">
                          {t(hasQuery ? "matchCount" : "ruleCount", {
                            count: category.rules.length,
                          })}
                        </span>
                      </div>
                      <ol className="flex flex-col gap-0.5">
                        {category.rules.map((rule) => {
                          const isMatch =
                            hasQuery && matches(rule.text, trimmedQuery);
                          return (
                            <li
                              key={rule.number}
                              className={cn(
                                "flex gap-[13px] rounded-xl border px-[13px] py-3",
                                isMatch
                                  ? "border-acc/25 bg-acc/[0.06]"
                                  : "border-transparent",
                              )}
                            >
                              <span
                                aria-hidden
                                className={cn(
                                  "w-[26px] flex-none pt-px font-mono text-[12.5px] font-bold tabular-nums",
                                  isMatch
                                    ? "text-acc-hover"
                                    : "text-foreground-tertiary",
                                )}
                              >
                                {rule.number}.
                              </span>
                              <span className="text-[14.5px] leading-[1.6] text-pretty text-foreground-secondary">
                                {rule.text}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  );
                })
              )}

              <section className="flex flex-wrap items-center gap-3.5 rounded-[18px] border border-border bg-surface-card p-[18px]">
                <div className="flex min-w-0 flex-col gap-1">
                  <h2 className="text-[14.5px] font-bold text-foreground">
                    {t("wrongRuleTitle")}
                  </h2>
                  <span className="text-[12.5px] leading-[1.5] text-pretty text-foreground-tertiary">
                    {t("wrongRuleNote")}
                  </span>
                </div>
                <Link
                  href="/feedback"
                  className={cn(
                    buttonClassName("secondary"),
                    "ms-auto flex-none",
                  )}
                >
                  {t("openSuggestions")}
                </Link>
              </section>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
