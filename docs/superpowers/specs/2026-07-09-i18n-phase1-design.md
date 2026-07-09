# i18n Phase 1 — Infrastructure + Working Language Switcher (Design)

**Issue:** velanto-frontend#44 (interface language selection). Backend `Pack.language` (velanto-backend#60) is explicitly **out of scope** — the user chose to skip it for now.

**Status:** design approved 2026-07-09; this doc precedes the implementation plan.

## Goal

Stand up next-intl so the interface renders in the user's chosen language, and ship a **working, demoable** language switcher — without yet extracting every screen's strings. This is **Phase 1** of a phased rollout: infrastructure + the Settings selector + a fully-translated, RTL-correct header/nav. Later phases extract the remaining screens, each as its own design→plan→ship cycle.

## Decisions locked during brainstorming

- **Frontend only.** No backend work. `Pack.language`/feed-filtering (velanto-backend#60) is deferred — packs stay unfiltered by language for now.
- **11 languages:** English (`en`), Mandarin Chinese (`zh`), Hindi (`hi`), Spanish (`es`), French (`fr`), Arabic (`ar`), Bengali (`bn`), Portuguese (`pt`), Russian (`ru`), Urdu (`ur`), Ukrainian (`uk`).
- **Library:** next-intl, in its **"without i18n routing" (cookie) mode** — no `/en/...` URL segments.
- **Locale source:** a `NEXT_LOCALE` cookie. On first visit (no cookie), negotiate from the `Accept-Language` header; fall back to English.
- **Lazy-loaded catalogs:** `getRequestConfig` dynamically `import()`s only the active locale's JSON — the other 10 are never bundled.
- **Translation sourcing:** English is the authored source of truth. The other 10 catalogs are **machine-translated** (by the implementer) and marked unverified. next-intl falls back to English for any missing key, so partial/rough catalogs degrade gracefully.
- **Full RTL** for Arabic and Urdu: set `dir` globally from the locale, and convert physical directional Tailwind utilities to logical ones. Phase 1 audits only the header/nav + Settings surface; later phases audit their own screens.
- **UI chrome only** — never translate user-generated pack content ("Pack content stays as the creator wrote it").
- **Selector placement:** Settings only for Phase 1 (matches the `Vilante Settings.dc.html` LANGUAGE section). A header quick-switcher is a possible later addition, not Phase 1.
- **`negotiateLocale` is hand-rolled** (small, unit-tested) rather than pulling in `negotiator`/`@formatjs/intl-localematcher`, to stay dependency-light.

## Architecture

next-intl "without i18n routing": no middleware, no `[locale]` segment. Flow per request:

```
request
  → getUserLocale()              // NEXT_LOCALE cookie, else negotiateLocale(Accept-Language), else 'en'
  → getRequestConfig             // lazy import()s messages/<locale>.json
  → app/layout.tsx (async)       // <html lang={locale} dir={isRtl?'rtl':'ltr'}> + <NextIntlClientProvider>
  → components                   // useTranslations('namespace') (client) / getTranslations (server)
```

User changes language in Settings → a `setUserLocale` **server action** writes the `NEXT_LOCALE` cookie and calls `revalidatePath('/', 'layout')`. Because a server action automatically re-renders the current route afterward, the layout (which reads the cookie) re-renders in the new locale and flips `dir` for `ar`/`ur` — no client-side `router.refresh()` needed.

### Message catalogs

One file per locale: `messages/<locale>.json`, with **nested namespaces** so keys are organized by area while still loading as a single file per locale:

```jsonc
{
  "common": { "appName": "Velanto", "save": "Save", "cancel": "Cancel", "loading": "Loading…" },
  "header": { "home": "Home", "create": "Create", "signIn": "Sign in", "signOut": "Sign out" },
  "settings": { "title": "Preferences", "language": "Language", "languageHint": "…" }
}
```

Phase 1 populates only `common`, `header`, and `settings`. Later phases add `home`, `create`, `play`, `result`, `profile`, `auth`, `admin`, etc. Each non-English file carries a top-of-file `"_note"` key flagging it as machine-translated / needs native review.

### Files — new

- `messages/{en,zh,hi,es,fr,ar,bn,pt,ru,ur,uk}.json` — 11 catalogs (`common`/`header`/`settings` namespaces).
- `src/i18n/config.ts` — `LOCALES` (readonly tuple), `DEFAULT_LOCALE = 'en'`, `RTL_LOCALES = ['ar','ur']`, `type Locale`, `isRtl(locale)`, and `LOCALE_NAMES` mapping each code to its **native** display name (`中文`, `العربية`, `Українська`, …) for the selector.
- `src/i18n/request.ts` — `getRequestConfig` reading the cookie via `getUserLocale()` and lazy-loading its catalog.
- `src/i18n/locale.ts` — `getUserLocale()` (server; cookie → negotiate → default), `setUserLocale(locale)` (`'use server'` action: validates against `LOCALES`, writes cookie, revalidates), and the pure, unit-tested `negotiateLocale(acceptLanguageHeader): Locale`.
- `src/features/settings/LanguageSection.tsx` — Settings section wrapper (label + hint + selector), matching the existing `AppearanceSection`/`NotificationsSection` pattern.
- `src/features/settings/LanguageSelector.tsx` — client `<select>` (or existing dropdown primitive) listing all 11 locales by native name, current value from `useLocale()`, `onChange` → `setUserLocale`.

### Files — modified

- `next.config.ts` — wrap the exported config with `createNextIntlPlugin('./src/i18n/request.ts')`.
- `app/layout.tsx` — becomes `async`; read `locale` via `getLocale()`, set `<html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'}>`, wrap the tree in `<NextIntlClientProvider>`. The existing theme-init script and providers stay.
- `src/shared/components/AppHeader.tsx` (and any nav subcomponents it renders) — replace hardcoded nav/auth strings with `useTranslations('header')`; swap physical directional utilities (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left/right`, `space-x-*`) for logical equivalents (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start/end`) so the header mirrors under RTL.
- `src/features/settings/SettingsScreen.tsx` — mount `<LanguageSection />`; translate the screen's own chrome (`"Preferences"` → `settings.title`).

## Data flow: locale detection & persistence

1. **No cookie (first visit):** `negotiateLocale` parses `Accept-Language` (respecting `q`-values, matching on the base language subtag, e.g. `uk-UA` → `uk`), returns the best supported locale or `DEFAULT_LOCALE`. We do **not** auto-write a cookie on detection — detection is recomputed until the user makes an explicit choice.
2. **User selects a language:** `setUserLocale` validates the code, writes `NEXT_LOCALE` (1-year max-age, `sameSite=lax`, `path=/`), and revalidates so SSR re-renders in the new locale.
3. **Subsequent visits:** cookie wins over `Accept-Language`.

## RTL strategy (Phase 1 scope)

- Global: `dir` on `<html>` driven by `isRtl(locale)`; browser handles text direction and default block flow.
- Convention: **logical properties everywhere** going forward. Phase 1 converts the header/nav + Settings-section components; the plan documents the physical→logical mapping so later phases apply it consistently.
- Phase 1 does **not** exhaustively audit screens outside header/settings — those keep physical utilities until their own phase (they render LTR text anyway until extracted).

## Rendering tradeoff (accepted)

Reading the `NEXT_LOCALE` cookie in the root layout opts the tree into **dynamic rendering**, so currently-static pages (e.g. the home feed, built as `○ Static`) become `ƒ` (dynamic). This is inherent to cookie-based i18n and acceptable: the SEO surface is pack content (untranslated), the feed already fetches live data, and this doesn't conflict with the `?p=` canonical work (velanto-frontend#73). No per-language URLs means no new canonical/hreflang concerns.

## Testing

- **Unit** (`src/i18n/locale.test.ts`): `negotiateLocale` — exact match, base-subtag match (`pt-BR`→`pt`), `q`-value ordering, unsupported → `en`, empty/garbage header → `en`. `isRtl` — `ar`/`ur` true, others false.
- **Component** (`LanguageSelector.test.tsx`): renders all 11 options by native name; reflects current locale; `onChange` invokes `setUserLocale` with the picked code (action mocked).
- **Component** (`AppHeader.test.tsx`, extended): renders translated nav strings when wrapped in `NextIntlClientProvider` with a fixture messages object (no reliance on real catalogs).
- **E2E** (Playwright): load app, switch to Arabic in Settings, assert a header string changes **and** `document.documentElement.dir === 'rtl'`; switch back to English → `dir === 'ltr'`.
- **Manual browser verification** (per the frontend workflow) against the live backend: switch across a few locales incl. an RTL one, confirm the header + settings render translated and mirror correctly, and that unextracted screens still render (falling back to their hardcoded English).

## Out of scope (Phase 1)

- Extracting strings from home/feed, create, play, result, profile, auth, admin, moderation, support (each is a later phase).
- Any backend change, including `Pack.language`/feed language filter (velanto-backend#60).
- A header quick-switcher (Settings-only for now).
- Localizing backend API error messages, dates/numbers formatting beyond what next-intl provides by default, and pluralization audits (revisit if a screen needs it).
- Professional/native review of the 10 machine-translated catalogs (tracked as follow-up).

## Follow-ups to file

- Later-phase issues (or checklist) for each screen-group's string extraction + RTL audit.
- A "native-review the machine translations" task before any real launch.
- Reconsider velanto-backend#60 (`Pack.language` + feed filter) once the interface language exists to default from.
