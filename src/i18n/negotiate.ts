import { DEFAULT_LOCALE, LOCALES, type Locale } from "./config";

/**
 * Picks the best supported locale from an `Accept-Language` header. Parses
 * `q`-values (default 1), sorts descending, and matches each entry on its base
 * language subtag (`pt-BR` → `pt`). Returns `DEFAULT_LOCALE` when nothing
 * matches. Pure and synchronous so it's unit-testable without a request.
 */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return { base: tag.trim().toLowerCase().split("-")[0], quality };
    })
    .filter((entry) => entry.base && !Number.isNaN(entry.quality))
    .sort((a, b) => b.quality - a.quality);

  for (const { base } of ranked) {
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale;
  }
  return DEFAULT_LOCALE;
}
