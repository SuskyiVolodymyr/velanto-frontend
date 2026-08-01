# 2.0.0 — Docs screen redesign (slice plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/docs` to full parity with the rest of the redesigned 2.0.0 content pages (Rules, Terms, Privacy, Updates) — which turns out to mean localized SEO metadata, not a visual rebuild. The screen's structure and component vocabulary already match the design system; the one real, verifiable gap is that its route never got the `generateMetadata` treatment every sibling content route already has.

**Architecture:** `app/docs/page.tsx` gains a `generateMetadata` export (mirroring `app/rules/page.tsx` / `app/updates/page.tsx` exactly: `getTranslations` → `metaTitle`/`metaDescription` → `buildOpenGraph`), backed by two new `docs.metaTitle` / `docs.metaDescription` keys added to all 8 locale catalogs. `src/features/docs/*` (`DocsScreen`, `DocsSidebar`, `DocsArticle`, `ApiDocs`, `ApiTokensSection`) is untouched — see Decision Points for why.

**Tech Stack:** Next.js 16 (App Router `generateMetadata`), next-intl (8 locales), Vitest + RTL.

---

## 0. Scope boundary — read this first

This is a **small, single-task slice**, not a rebuild. Docs already looks and behaves like the rest of the 2.0.0-redesigned UI:

- It already uses the shared component vocabulary (`Card`, `Text` with `title`/`secondary`/`tertiary` variants, `Select`) that Rules/Legal/Updates were rebuilt onto.
- It already has the sticky-sidebar pattern (`md:sticky md:top-[80px]`) those three pages use for their TOC/rail, plus a **mobile-appropriate variant** of it: a native `<select>` dropdown instead of a flat jump-link list, because Docs' nav is two-level (section → topic, 4 sections / 6 topics) and _swaps_ the visible article rather than scrolling to an anchor — a genuinely different interaction model from Rules'/Legal's/Updates' single-level "jump to a heading on this same long page" TOCs. This is a deliberate, already-correct divergence, not a gap (see D2).
- `docs/superpowers/plans/2026-07-28-content-pages-mock-patch.md` — the plan that redesigned Rules/Legal/Updates against their real mocks this same epic — explicitly audited Docs and ruled it out of scope: _"an audit already confirmed the shipped Docs screen already has the mock's structural pattern (sidebar TOC) and, where the mock's prose differs from shipped copy, the SHIPPED copy is the more accurate/complete one... Do not touch `src/features/docs/*`."_ That audit had real access to the current mocks; this plan does not (see D1) and treats that finding as authoritative for structure/content.

What IS a real, verifiable gap — found by comparing code, not a mock — is that `app/docs/page.tsx` never received the `generateMetadata` pattern that **every other content-adjacent route** (`app/rules/page.tsx`, `app/terms/page.tsx`, `app/privacy/page.tsx`, `app/updates/page.tsx`, plus `myPacks`/`people`) already carries: a localized title via `getTranslations`, a meta description, a canonical URL, and `buildOpenGraph`. Today it's a bare hardcoded `{ title: "Docs" }` — untranslated, no description, no canonical, no explicit OpenGraph — despite `/docs` being one of only four paths in `app/sitemap.ts`'s `STATIC_PATHS` (`"/"`, `"/docs"`, `"/feedback"`, `"/updates"`), so it's actively submitted to search engines in this state. That's the entire scope of this plan.

### DO NOT TOUCH (functionally and structurally correct, out of scope)

| Area                                                                      | Files                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Topic content, sidebar nav, mobile `<Select>`                             | `src/features/docs/DocsScreen.tsx`, `DocsSidebar.tsx`, `DocsArticle.tsx` |
| API/token docs prose + scope cards + MCP config sample                    | `src/features/docs/ApiDocs.tsx`, `scope-keys.ts`                         |
| Token manager (mint/list/revoke)                                          | `src/features/docs/ApiTokensSection.tsx`, `api/tokens.queries.ts`        |
| Behavior-pinned copy tests (`statsAnonNote` #221, `compareCardBody` #222) | `src/features/docs/DocsScreen.test.tsx`                                  |
| All existing `docs.*` body-copy keys in `messages/*.json`                 | every locale catalog — only the two new SEO keys are added               |

### IN SCOPE

`app/docs/page.tsx` (add `generateMetadata`), `app/docs/page.test.tsx` (new), `messages/*.json` × 8 (two new keys in the `docs` namespace).

---

## 0b. Decision points (do NOT silently resolve these — confirm before implementing)

**D1 — No real mock access in this environment; the prior in-repo audit + direct comparison against the already-redesigned siblings stand in for it.**
This plan was written from a sandboxed session with no access to `design/extracted/design_handoff_vilante/` (not present on disk here — it lives outside both repos' git trees) and no working DesignSync-style fetch tool. Rather than guess at pixel-level details with no source of truth, this plan leans on two things that _are_ verifiable in-repo: (1) `2026-07-28-content-pages-mock-patch.md`'s explicit, specific audit finding that Docs already matches its mock's structural pattern and that the mock's own prose is the less accurate of the two — written by an agent that _did_ have real mock access, this same epic; (2) a direct code diff of `DocsScreen`/`DocsSidebar`/`DocsArticle`/`ApiDocs` against `RulesScreen.tsx`/`LegalScreen.tsx`/`UpdatesScreen.tsx` **after** those three were rebuilt against their real mocks — which shows Docs already on the same component vocabulary and spacing/typography idioms (`Card`, `Text` variants, `text-3xl` H1s, `leading-7` body copy, `top-[80px]` sticky nav). If a future session gets real DesignSync/design-folder access and finds a concrete visual mismatch this plan missed, that's new information this plan didn't have — file it separately rather than treating this plan as having missed something it could have checked.

**D2 — Docs' mobile `<select>` nav vs. Rules'/Legal's/Updates' "TOC becomes a non-sticky row above the content" collapse. Keep Docs' `<select>`.**
The three redesigned siblings all collapse their sticky TOC into a plain list sitting above the article below a ~900-940px breakpoint — that works because each is a _single_ long page and the TOC just jumps to an anchor within it. Docs' nav is two-level (`OVERVIEW`/`CREATORS`/`PLAYERS`/`DEVELOPERS` sections, 6 topics) and picking a topic _swaps_ the entire article rather than scrolling — a flat row of 6 topic buttons wouldn't carry the section grouping and would be a worse mobile experience than the existing grouped `<optgroup>` `<select>`. This was a deliberate choice already documented in `DocsSidebar.tsx`'s own comment ("Mobile: a compact dropdown instead of the full stacked list, so the article isn't pushed way down the page"). No change.

**D3 — Not adding a closing "still have questions?" callout card, even though Rules/Legal/Updates all end with one.**
All three redesigned siblings close with a `Card` linking to `/feedback` (Rules: "Think a rule is wrong?"; Legal: "Questions about this document?"; Updates: "Missing something you want?"). That's a strong cross-page pattern, and Docs arguably wants a "Didn't find what you needed?" equivalent. **Not adding it here**: unlike those three, whose callout _copy_ was verbatim-checked against a real mock, there is no Docs mock available in this session to check against, and this project's own established discipline (`content-pages-mock-patch.md`'s "zero content changes... if you notice a copy difference, STOP and flag it, don't invent it") is specifically about not inventing UI copy without a mock backing it. Adding a plausible-sounding card here would violate that discipline in the opposite direction — writing copy with nothing to check it against. Flagged for a future session that has real mock access to confirm one way or the other; not built speculatively now.

**D4 — Container width/padding differs slightly from Rules/Legal/Updates (`max-w-5xl px-7 py-10` vs. their `max-w-[1100px]`/`[1040px]`/`[1080px]` + `px-6 py-12`). Not a gap.**
There's no shared `PageContainer` component in this codebase — every screen hand-rolls its own `<main className="mx-auto w-full max-w-[...] px-... py-...">`, and the three redesigned siblings _already_ disagree with each other (1100px / 1040px / 1080px). Docs' 1024px (`5xl`) + `px-7 py-10` is well inside that existing spread, not an outlier that needs "fixing" to some single canonical value that doesn't exist. Left alone.

---

## Task 1: Add localized SEO metadata to `/docs`

**Files:**

- Modify: `app/docs/page.tsx`
- Create: `app/docs/page.test.tsx`
- Modify: `messages/en.json` (new keys: `docs.metaTitle`, `docs.metaDescription`)

- [ ] **Step 1: Write the failing test**

Create `app/docs/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import messages from "@/messages/en.json";
import { OG_IMAGE_PATH } from "@/src/shared/lib/open-graph";
import { generateMetadata } from "./page";

// getTranslations needs a request context we don't have in unit tests; back it
// with the real English catalog so assertions read the shipped copy — same
// approach as app/rules/page.test.tsx.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const value = (messages.docs as Record<string, unknown>)[key];
    return typeof value === "string" ? value : key;
  }),
}));

describe("docs generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets an absolute title, description, canonical, and OpenGraph", async () => {
    const meta = await generateMetadata();

    expect(meta.title).toEqual({ absolute: "Docs — Velanto" });
    expect(meta.description).toBe(messages.docs.metaDescription);
    expect(meta.alternates?.canonical).toMatch(/\/docs$/);
    expect(meta.openGraph?.url).toMatch(/\/docs$/);
  });

  // #235: declaring `openGraph` at all disinherits app/opengraph-image.tsx, so
  // the card has to be named here or the page previews blank everywhere OG is
  // read. Mirrors the same regression guard in app/rules/page.test.tsx.
  it("names the social card image explicitly", async () => {
    const meta = await generateMetadata();
    const images = meta.openGraph?.images as { url: string; width: number }[];

    expect(images).toHaveLength(1);
    expect(images[0].url).toBe(OG_IMAGE_PATH);
    expect(images[0].width).toBe(1200);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npm test -- app/docs/page.test.tsx`
Expected: FAIL — `generateMetadata` is not exported from `./page` (module has no such export yet), and/or `messages.docs.metaTitle`/`metaDescription` are `undefined`.

- [ ] **Step 3: Add the two new keys to `messages/en.json`**

In the `docs` namespace (starts at the `"docs": {` opening brace, currently followed immediately by `"secOverview": "OVERVIEW",`), add two keys as the first entries:

```json
  "docs": {
    "metaTitle": "Docs — Velanto",
    "metaDescription": "How Velanto works — building a pack, the five formats, playing, and the API for AI assistants.",
    "secOverview": "OVERVIEW",
```

(Only those two lines are new; everything from `"secOverview"` on is the existing, untouched content.)

- [ ] **Step 4: Implement `generateMetadata` in `app/docs/page.tsx`**

Replace the file's contents:

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { DocsScreen } from "@/src/features/docs/DocsScreen";
import { buildOpenGraph } from "@/src/shared/lib/open-graph";
import { SITE_URL } from "@/src/shared/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs");
  const title = t("metaTitle");
  const description = t("metaDescription");
  const url = `${SITE_URL}/docs`;
  return {
    // Absolute overrides the layout's "%s | Velanto" template, matching every
    // other content route (rules/terms/privacy/updates).
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({ title, description, url }),
  };
}

export default function DocsPage() {
  // DocsScreen reads the active topic from the query string, which needs a
  // Suspense boundary for this route to stay statically rendered.
  return (
    <Suspense>
      <DocsScreen />
    </Suspense>
  );
}
```

- [ ] **Step 5: Run the test again, confirm it passes**

Run: `npm test -- app/docs/page.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 6: Run the existing `DocsScreen` suite to confirm nothing else broke**

Run: `npm test -- src/features/docs`
Expected: PASS — `DocsScreen.test.tsx` and `ApiTokensSection.test.tsx` are unaffected by a route-level metadata change.

- [ ] **Step 7: Commit**

```bash
git add app/docs/page.tsx app/docs/page.test.tsx messages/en.json
git commit -m "feat(docs): add localized SEO metadata to /docs (T1)"
```

---

## Task 2: Translate the new keys × 7 locales, then full gates + PR

**Files:**

- Modify: `messages/{zh,hi,ar,bn,ru,ur,uk}.json`

- [ ] **Step 1: Add `docs.metaTitle` / `docs.metaDescription` to each of the 7 other catalogs**

Insert as the first two keys inside each file's `"docs": {` object (same position as `en.json`, immediately before the existing `secOverview`-equivalent key — do not reorder or touch anything else in the namespace). Reusing each locale's already-established nav word for "Docs" (from the `docs` key under the nav/`header` namespace) and its already-established words for "pack" / format name / "API" (from elsewhere in that locale's own `docs` namespace), so terminology stays consistent within the language per `messages/README.md`'s "same English term → same translation" rule:

`messages/zh.json`:

```json
  "docs": {
    "metaTitle": "文档 — Velanto",
    "metaDescription": "了解 Velanto 的使用方法——创建题包、五种赛制、游玩方式，以及连接 AI 助手的 API。",
```

`messages/hi.json`:

```json
  "docs": {
    "metaTitle": "दस्तावेज़ — Velanto",
    "metaDescription": "Velanto कैसे काम करता है — पैक बनाना, पाँच फ़ॉर्मैट, खेलना, और AI असिस्टेंट के लिए API।",
```

`messages/ar.json`:

```json
  "docs": {
    "metaTitle": "التوثيق — Velanto",
    "metaDescription": "كيف يعمل Velanto — إنشاء حزمة، الصيغ الخمس، اللعب، وواجهة API لمساعدي الذكاء الاصطناعي.",
```

`messages/bn.json`:

```json
  "docs": {
    "metaTitle": "ডকুমেন্টেশন — Velanto",
    "metaDescription": "Velanto কীভাবে কাজ করে — প্যাক তৈরি করা, পাঁচটি ফরম্যাট, খেলা এবং AI সহকারীর জন্য API।",
```

`messages/ru.json`:

```json
  "docs": {
    "metaTitle": "Документация — Velanto",
    "metaDescription": "Как работает Velanto — создание пака, пять форматов, игра и API для AI-ассистентов.",
```

`messages/ur.json`:

```json
  "docs": {
    "metaTitle": "دستاویزات — Velanto",
    "metaDescription": "Velanto کیسے کام کرتا ہے — پیک بنانا، پانچ فارمیٹس، کھیلنا، اور AI اسسٹنٹ کے لیے API۔",
```

`messages/uk.json`:

```json
  "docs": {
    "metaTitle": "Документація — Velanto",
    "metaDescription": "Як працює Velanto — створення пака, п'ять форматів, гра та API для AI-асистентів.",
```

- [ ] **Step 2: Run the catalog-parity test**

Run: `npm test -- catalogs`
Expected: PASS — `src/i18n/catalogs.test.ts` fails if any locale's key set diverges from `en.json`; this confirms all 8 catalogs now carry exactly the same `docs.metaTitle`/`docs.metaDescription` keys.

- [ ] **Step 3: Full local gates**

Run in order:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all four succeed. (`npm run build` additionally catches a structurally broken JSON catalog, per `messages/README.md`.)

- [ ] **Step 4: `pr-review-toolkit:code-reviewer` on the full branch diff**

Fix any Critical/Important findings, re-review until clean. Given the scope, explicitly ask it to confirm: (a) no `src/features/docs/*` file was touched, and (b) no existing `docs.*` key's value changed — only two new keys were added per locale.

- [ ] **Step 5: Open PR into `release/2.0.0`, self-merge per standing 2.0.0 authorization**

State all gate results (Step 3) in the PR body — no CI runs on `release/*` branches. Delete the branch after merge.

---

## Self-review

- **Spec coverage:** the task asked for a full plan diffing current `/docs` against the real mock and closing the real gaps. The real gap found (no mock access notwithstanding) is the missing `generateMetadata` parity with every sibling content route — covered by Task 1. The absence of a larger visual gap is itself the finding, documented in D1–D4 rather than papered over.
- **Placeholder scan:** no TBDs; every step has literal file contents, exact commands, and expected output. All 8 locale translations are real strings, not stubs.
- **Type consistency:** `generateMetadata`'s return shape (`title`/`description`/`alternates.canonical`/`openGraph`) matches the `Metadata` type from `next` and the exact pattern already compiling in `app/rules/page.tsx` / `app/updates/page.tsx` — no new types introduced.
