# Translations (`messages/`)

One JSON catalog per locale, loaded by next-intl. `en.json` is the **source of truth** — add keys there first. The other 7 are **AI-translated** (no human translators on this project) and refined for natural phrasing; treat them as final but improvable. Report wording problems on [velanto-frontend#44](https://github.com/SuskyiVolodymyr/velanto-frontend/issues/44).

## Locales

`en` English (source) · `zh` 中文 (Simplified) · `hi` हिन्दी · `ar` العربية (RTL) · `bn` বাংলা · `ru` Русский · `ur` اردو (RTL) · `uk` Українська

`ar` and `ur` are right-to-left — the app sets `<html dir="rtl">` for them (see `src/i18n/config.ts` `RTL_LOCALES`). Values are RTL script; JSON keys/structure stay LTR. Never embed directional-control characters.

**Spanish, French and Portuguese were removed** ([#226](https://github.com/SuskyiVolodymyr/velanto-frontend/issues/226)). Not a translation-quality decision: shipping the interface in an EU language is the evidence that a Ukraine-established operator targets EU data subjects (GDPR Recital 23), which triggers GDPR + the DSA and their two paid representative requirements. The catalogs are preserved in git history and can be restored in minutes — this is a "re-add when it's affordable" decision, not a permanent one. A pack's **content** language is unaffected: all 11 remain selectable, since user-generated metadata carries no targeting signal.

## How to add strings (later phases)

1. Add the key(s) to `en.json` under the right namespace (nest by area: `header`, `settings`, `home`, `create`, …).
2. Add the **same keys** to all 10 other catalogs with translated values. next-intl falls back to `en` for any missing key, but keep them complete.
3. Keep each file's `_note` first key intact.
4. Run `npx tsc --noEmit` + `npm run build` (a structurally broken catalog fails the dynamic import).

## Style / terminology rules (keep consistent across phases)

- **Register:** neutral/polite UI voice. Buttons follow each language's convention (e.g. FR infinitive "Se connecter", ES "Iniciar sesión").
- **Same English term → same translation** everywhere within a language.
- **`languageLabel` and `languageSelectAria`** are the same English ("Interface language") → must be identical within each catalog.
- **Loanwords are fine** where a real app in that language uses them (e.g. hi `सेटिंग्स`, `मॉडरेशन`; ur `ماڈریشن`, `ایڈمن`; bn `সেটিংস`). Prefer the term users actually recognize over a "purer" but unfamiliar one.
- **`Settings` (nav) vs `Preferences` (Settings-page title)** — English uses two words on purpose. Mirror the distinction only where it's natural; several languages correctly collapse both to their standard "settings" word (e.g. `ru` uses Настройки for both). Don't force an awkward synonym.
- **"pack"** = a quiz/elimination content pack a user creates. Translate the concept consistently (package/bundle, or an accepted transliteration like hi `पैक` / bn `প্যাক` / ur `پیک`). Never translate the actual user-authored pack _content_ — only UI chrome.
- **Brand name "Velanto"** is never translated.

## What's translated so far (Phase 1)

`header` (global nav/menu) and `settings` (Settings page title + Language section). Every other screen is still hardcoded English pending its own extraction phase — see #44.
