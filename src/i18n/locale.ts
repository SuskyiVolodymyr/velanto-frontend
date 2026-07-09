"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, type Locale } from "./config";
import { negotiateLocale } from "./negotiate";

const COOKIE_NAME = "NEXT_LOCALE";

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
