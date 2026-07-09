"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "./config";

const COOKIE_NAME = "NEXT_LOCALE";

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
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
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

/** Server-only: cookie wins, else negotiate from `Accept-Language`, else default. */
export async function getUserLocale(): Promise<Locale> {
  const cookieValue = (await cookies()).get(COOKIE_NAME)?.value;
  if (cookieValue && isLocale(cookieValue)) return cookieValue;
  return negotiateLocale((await headers()).get("accept-language"));
}

/** Server action: persist the chosen locale and re-render. */
export async function setUserLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
