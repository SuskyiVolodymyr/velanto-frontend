export const LOCALES = [
  "en",
  "zh",
  "hi",
  "es",
  "fr",
  "ar",
  "bn",
  "pt",
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
  es: "Español",
  fr: "Français",
  ar: "العربية",
  bn: "বাংলা",
  pt: "Português",
  ru: "Русский",
  ur: "اردو",
  uk: "Українська",
};
