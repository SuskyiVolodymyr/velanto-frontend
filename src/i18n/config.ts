/**
 * Interface languages. A SUBSET of the backend's `PACK_LANGUAGES` (a pack's
 * content language) — not a mirror of it.
 *
 * Spanish, French and Portuguese were deliberately dropped (#226): shipping the
 * interface in an EU language is the evidence that a Ukraine-established
 * operator "envisages offering services to data subjects in the Union" (GDPR
 * Recital 23), which pulls the whole service under GDPR and the DSA and their
 * two representative requirements. Ukrainian and Russian are exempt as
 * languages of the operator's own country; the rest are not EU languages.
 * English is kept: mere accessibility is expressly insufficient, and EDPB
 * Guidelines 3/2018 Example 16 found a site offering a home language + English
 * was not targeting.
 *
 * A pack may still be *labelled* Spanish — content language is user-generated
 * metadata and carries no targeting signal. See
 * docs/superpowers/specs/2026-07-16-legal-docs-research.md.
 */
export const LOCALES = [
  "en",
  "zh",
  "hi",
  "ar",
  "bn",
  "ru",
  "ur",
  "uk",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Right-to-left scripts among our supported locales.
export const RTL_LOCALES: readonly Locale[] = ["ar", "ur"];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

// Native display names — each speaker recognizes their own language.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  hi: "हिन्दी",
  ar: "العربية",
  bn: "বাংলা",
  ru: "Русский",
  ur: "اردو",
  uk: "Українська",
};
