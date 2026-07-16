/**
 * The languages a pack's CONTENT can be labelled as — MIRRORED from
 * velanto-backend `src/modules/packs/types/language.ts` (`PACK_LANGUAGES`).
 * Snapshotted in `src/shared/types/cross-repo-drift.test.ts`; change both repos
 * together or the API silently rejects a value the picker offers.
 *
 * NOT the same thing as the interface `LOCALES` (`src/i18n/config.ts`), and the
 * distinction is the whole point of this file existing:
 *
 *   LOCALES (8, the UI is translated into these) ⊆ PACK_LANGUAGES (11)
 *
 * es/fr/pt are absent from LOCALES because shipping the *interface* in an EU
 * language is what makes a Ukraine-established operator "target" EU data
 * subjects (GDPR Recital 23 — see #226). They stay here because a pack's
 * content language is user-generated metadata and carries no such signal: a
 * user reading an English UI may still label their pack Spanish, and should be
 * able to. Until the picker existed, that was only a claim — nothing could set
 * this field, so every pack was 'en' (#239).
 *
 * The subset direction is load-bearing: the picker defaults to the author's
 * interface language, so every LOCALE must be a legal PACK_LANGUAGE. The
 * reverse need not hold.
 */
export const PACK_LANGUAGES = [
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

export type PackLanguage = (typeof PACK_LANGUAGES)[number];

/** Mirrors the backend's `DEFAULT_PACK_LANGUAGE`. */
export const DEFAULT_PACK_LANGUAGE: PackLanguage = "en";

export function isPackLanguage(value: string): value is PackLanguage {
  return (PACK_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Native display names — each speaker recognizes their own language, and the
 * label is data about the pack rather than interface chrome, so it is not
 * translated per locale.
 *
 * These deliberately overlap with `LOCALE_NAMES` for the 8 shared codes rather
 * than importing them: LOCALE_NAMES describes what the UI is available in, this
 * describes what a pack can be about. They answer different questions and are
 * free to diverge.
 */
export const PACK_LANGUAGE_NAMES: Record<PackLanguage, string> = {
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
