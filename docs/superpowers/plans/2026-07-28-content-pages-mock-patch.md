# Content Pages (Rules, Legal, Updates) — Real-Mock UI Patch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Rules, Legal (Terms/Privacy), and Updates to match the real, current Claude Design mocks (`Rules.dc.html`, `Legal.dc.html`, `Updates.dc.html`, DesignSync project `67c2561f-a9ab-433b-a48b-d1a3e2aa88d8`).

**Docs is explicitly OUT OF SCOPE for this plan** — an audit already confirmed the shipped Docs screen already has the mock's structural pattern (sidebar TOC) and, where the mock's prose differs from shipped copy, the SHIPPED copy is the more accurate/complete one (the mock describes a retired feature and omits explanations the shipped copy correctly includes). Do not touch `src/features/docs/*` in this plan.

**Architecture — CRITICAL CONSTRAINT: this is a LAYOUT-ONLY patch, zero content changes.** A prior audit checked every page's prose word-for-word against the real mock:
- Rules: all 12 categories' rule text is 100% verbatim identical between shipped and mock.
- Legal: Terms (16 sections) and Privacy (21 of 22 sections) are 100% verbatim identical on every number/date/retention period. The mock is simply MISSING Privacy's closing "Contact" section that shipped already has — keep that section, the mock's omission is not authoritative.
- Updates: all 10 changelog entries are 100% verbatim identical.

**Do not change, rewrite, retranslate, or "improve" ANY body copy, rule text, legal section, or changelog entry in this plan.** Every task below is markup/layout/interaction only. If you notice what looks like a copy difference while implementing, STOP and flag it in your report rather than changing it — the audit already covers this ground and a new discrepancy is more likely you misreading than a real gap.

**Tech Stack:** Next.js 16, Tailwind, next-intl (8 locales) — only new UI-chrome strings (button labels, empty-state text, section headers) need i18n keys; page BODY content strings already exist in the catalogs and must not be touched.

---

### Task 1: Rules — search, sticky category TOC, callout cards

**Files:**
- Modify: `src/features/rules/RulesScreen.tsx`
- Modify: `messages/en.json` (new UI-chrome keys only, e.g. `rules.searchPlaceholder`, `rules.noMatch`, `rules.tryPlainer`, `rules.clearSearch`, `rules.reportNote`, `rules.wrongRuleTitle`, `rules.wrongRuleNote`, `rules.openSuggestions`)

- [ ] **Step 1: Add the search input**
  Mock: a search field ("Search the rules…") in the hero, with a clear (×) button that appears once there's a query. Wire it to filter rules client-side: a rule matches if its text contains the query (case-insensitive substring), matching the mock's `matches()` logic. Filtering happens per-category — a category with zero matching rules is hidden entirely (mirror the mock's `cats.filter(c => c.visible.length > 0)`).

- [ ] **Step 2: Add the two-column layout with a sticky categories TOC**
  Mock: `grid-template-columns: minmax(0,232px) minmax(0,1fr)` — left = sticky TOC (category number + title, jump-links via `href="#{categoryId}"`), right = the existing category sections. Restructure `RulesScreen.tsx` into this grid; keep the existing section/rule rendering, just move it into the right column and add the left TOC nav built from the same `categories` data already in scope. Responsive: collapse to a single column below ~940px (TOC becomes a non-sticky row above the content, matching the mock's breakpoint).

- [ ] **Step 3: Add the "Something break a rule?" callout in the TOC sidebar**
  Small card below the TOC list: title + a note explaining Report on a pack/comment/profile surfaces the picked rule to moderators. Static content, no new data needed.

- [ ] **Step 4: Add the empty-search-result state**
  When a query matches zero rules, render the mock's empty state: dashed-border panel, search icon, `No rule matches "{query}"` + `Try a plainer word — "spam", "copy", "ban".` + a "Clear search" button that resets the query.

- [ ] **Step 5: Add the closing "Think a rule is wrong?" callout**
  Full-width card at the bottom: title + note ("Rules change when enough people argue well. Post it as a suggestion.") + an "Open Suggestions" button linking to the Suggestions page (check the actual route — likely `/suggestions` or similar, Grep first).

- [ ] **Step 6: Optionally add the matched-rule highlight**
  Mock highlights (cyan-tinted background/border) a rule row when it matches the active search query. Nice-to-have if it falls out naturally from Step 1's filter data; don't force it if it complicates the component.

- [ ] **Step 7: Update/add `RulesScreen.test.tsx`, run it**

- [ ] **Step 8: Commit**
  `git commit -m "refactor(rules): add search, sticky TOC, and callout cards per real mock (T1)" -- src/features/rules/RulesScreen.tsx src/features/rules/RulesScreen.test.tsx messages/en.json`

---

### Task 2: Legal — Terms/Privacy toggle header, sticky TOC, contact card

**Files:**
- Modify: `src/features/legal/LegalScreen.tsx`
- Modify: `app/terms/page.tsx`, `app/privacy/page.tsx` (if the toggle needs to live above/around the shared screen component)
- Modify: `messages/en.json` (new UI-chrome keys only, e.g. `legal.termsTab`, `legal.privacyTab`, `legal.onThisPage`, `legal.questionsTitle`, `legal.questionsNote`)

- [ ] **Step 1: Add the Terms/Privacy toggle in the header**
  Mock: a small segmented toggle (Terms | Privacy) in the sticky header, letting a visitor switch documents without leaving the page. Since `/terms` and `/privacy` are separate routes today (not a single hash-routed page like the mock), implement the toggle as two links between the two routes (not client-side state) — preserves real URLs/SEO for each document, which the mock's single-file demo didn't need to care about. Style to match the mock's segmented-button look.

- [ ] **Step 2: Add the sticky right-side "ON THIS PAGE" TOC**
  Mock: `grid-template-columns: minmax(0,1fr) 250px`, right column = a sticky, scrollable nav of every section title as a jump-link (slugified from the title, matching the mock's `slug()` function: lowercase, non-alnum→hyphen, trim edge hyphens). Restructure `LegalScreen.tsx` into this two-column grid; keep all existing section rendering in the left column. Responsive: collapse to single column below ~900px (TOC becomes a non-sticky row above content).

- [ ] **Step 3: Add the "Questions about this document?" contact card**
  Card at the bottom of the article (inside the left column, below all sections): icon + title + note ("One person reads that inbox, and answers within 30 days.") + the `support@playvelanto.com` mailto link. This REPLACES the plain-text contact mention currently embedded in the last section's body — do NOT delete the existing Contact section's text from the i18n catalog (Terms' "Contact" section / Privacy's "Contact" section both already exist and must keep rendering as regular sections); this card is an ADDITIONAL visual treatment alongside them, not a replacement for the section content itself. If that reads as duplicative once built, note it in your report rather than deciding unilaterally to remove either.

- [ ] **Step 4: Confirm the "Last updated" chip styling matches the mock**
  Small style-only adjustment — mock renders it as a bordered mono chip with a clock icon; check current treatment and align if it's meaningfully different.

- [ ] **Step 5: Update/add tests for `LegalScreen.tsx` and both route files, run them**

- [ ] **Step 6: Commit**
  `git commit -m "refactor(legal): add doc-toggle header, sticky TOC, contact card per real mock (T2)" -- src/features/legal/LegalScreen.tsx app/terms/page.tsx app/privacy/page.tsx messages/en.json`
  (include any test files touched)

---

### Task 3: Updates — timeline layout, releases rail, bullet truncation

**Files:**
- Modify: `src/features/updates/UpdatesScreen.tsx`
- Modify: `messages/en.json` (new UI-chrome keys only, e.g. `updates.showMore`, `updates.showLess`, `updates.latest`, `updates.changesCount`, `updates.missingTitle`, `updates.missingNote`, `updates.openSuggestions`)

- [ ] **Step 1: Restructure into the mock's two-column layout**
  `grid-template-columns: minmax(0,1fr) 210px` — left = the entry timeline, right = a sticky "RELEASES" rail linking to each entry by version (jump-link `href="#v{version-with-dashes}"`, matching the mock's `"v" + e.version.replace(/\./g, "-")` id scheme). Responsive: collapse to single column below ~900px (rail becomes a non-sticky row above content).

- [ ] **Step 2: Add the timeline spine + dot per entry**
  Each entry gets a connecting vertical line + a dot marker (larger/filled cyan with a glow ring for the latest entry, smaller/dim for the rest) — matches the mock's left-edge timeline visual. Hide the spine/dot on narrow viewports if it doesn't fit cleanly (mock does this below ~620px).

- [ ] **Step 3: Add the LATEST pill and change-count badge**
  First entry (already-sorted newest-first, per existing `UpdatesScreen` logic) gets a "LATEST" pill next to its version badge. Every entry gets a right-aligned count badge ("N changes" / "1 change" singular) computed from its bullet list length.

- [ ] **Step 4: Add bullet truncation with "Show N more" / "Show less"**
  This is the one real interaction change: cap each entry's visible bullets at 4 (`PREVIEW_BULLETS = 4`, matching the mock exactly — pin this constant, it's a deliberate UX choice not a magic number to vary) with a toggle button showing the remaining count when collapsed. State is per-entry (an `open: Record<string, boolean>` map keyed by `version-date`, matching the mock's approach) so expanding one entry doesn't affect others. The full, untruncated bullet text is unchanged — this only affects how many render before the toggle.

- [ ] **Step 5: Add the closing "Missing something you want?" callout**
  Card at the bottom: icon + title + note ("Suggestions get read and voted on — a lot of the list above started there.") + an "Open suggestions" button linking to the Suggestions route.

- [ ] **Step 6: Update/add `UpdatesScreen.test.tsx`, run it — pay attention to the new truncation behavior**
  Add a test confirming an entry with >4 bullets renders exactly 4 plus a toggle, and that clicking the toggle reveals the rest without affecting other entries' expand state.

- [ ] **Step 7: Commit**
  `git commit -m "refactor(updates): timeline layout, releases rail, bullet truncation per real mock (T3)" -- src/features/updates/UpdatesScreen.tsx src/features/updates/UpdatesScreen.test.tsx messages/en.json`

---

### Task 4: i18n × 8 locales + e2e + full gates + PR

**Files:**
- Modify: `messages/{uk,ru,ar,ur,hi,bn,zh}.json`
- Modify: relevant e2e specs (Grep for `rules`, `terms`, `privacy`, `updates` spec files) if any selectors break

- [ ] **Step 1: Translate every new UI-chrome key from Tasks 1–3 into all 7 non-English locales**
  These are ONLY the new interaction/label strings added in Tasks 1–3 (search placeholder, toggle labels, TOC heading, callout titles/notes, "show more"/"show less", "N changes", etc.) — the underlying rule/legal/changelog BODY content is untouched and already fully localized, do not re-touch it.

- [ ] **Step 2: `npm run test -- catalogs`**

- [ ] **Step 3: Fix any e2e selectors broken by the layout restructures**
  `npm run test:e2e -- rules terms privacy updates` (adjust to actual spec file names/patterns).

- [ ] **Step 4: Full local gates**
  `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.

- [ ] **Step 5: `pr-review-toolkit:code-reviewer` on the full branch diff**
  Fix any Critical/Important findings, re-review until clean. Explicitly ask it to confirm no body-copy/content text was altered anywhere in the diff — that's the one hard constraint this plan cannot violate.

- [ ] **Step 6: Open PR into `release/2.0.0`, self-merge per standing 2.0.0 authorization**
  State all gate results in the PR body (no CI runs on `release/*`). Delete the branch after merge.
