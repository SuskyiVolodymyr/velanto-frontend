# Create Pack — Real-Mock Patch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Patch the just-shipped Create Pack redesign (merge `ff28aef`) against the REAL, current Claude Design mock (`Create Pack.dc.html`, DesignSync project `67c2561f-a9ab-433b-a48b-d1a3e2aa88d8`) — the original build was accidentally built from a stale local mock folder (`design/extracted/design_handoff_vilante/`, now deleted). Owner ruling: "Claude Design is source of truth now — about UI, but not business logic."

**Architecture:** Pure UI/copy patch on top of the existing `src/features/create/*` component set and data model — no new fields, no new backend calls. One exception requiring a small decision (T2, cover-image checklist wiring) — resolved inline below, not deferred.

**Explicitly OUT OF SCOPE (flagged, not built):** the mock's "Friend modes unlocked" / "SCORED" feasibility panel — it maps to room modes (Claim/Voting/Turn-based cut/Guess Who/Shared-grid-Relay) from the still-dormant multiplayer epic (`friends-rooms-client.create` 503s in prod). Do not build any part of it.

**Tech Stack:** Next.js 16, React Hook Form, Tailwind, next-intl (8 locales).

---

### Task 1: Consolidate sticky action bar (single button + header chrome)

**Files:**

- Modify: `src/features/create/CreatePackForm.tsx` (sticky bar section, currently ~lines 267–312)
- Modify: `src/features/create/CreatePreviewPanel.tsx` (remove the desktop-only Publish CTA at the bottom; its content moves into Task 2's checklist panel)
- Modify: `messages/en.json` (and other 7 locales in Task 8) — new keys under `create.bar.*`

- [ ] **Step 1: Replace the two Publish buttons with one responsive-label button in the sticky bar**
      Currently there are TWO ctas: a mobile-only button in `CreatePackForm.tsx`'s sticky bar (`className="lg:hidden"`, label `t("publish")`="Publish") and a desktop-only one in `CreatePreviewPanel.tsx` (label `t("preview.publishReady")`="Publish pack" / blocked "Add a title & elements"). The mock has exactly ONE button, always in the sticky bar, whose _visible text_ shrinks via a responsive span pair at ≤720px (`"Submit for review"` full / `"Submit"` short) — not two separate elements gated by breakpoint.
      Remove the desktop CTA from `CreatePreviewPanel.tsx` entirely (Task 2 replaces that aside slot anyway). In `CreatePackForm.tsx`'s sticky bar, make the ONE button always visible (drop `lg:hidden`), and render its label as two `<span>`s — a full label `create.bar.submit` = "Submit for review" hidden below 720px, a short label `create.bar.submitShort` = "Submit" hidden at ≥720px (CSS `hidden max-[720px]:inline` / `max-[720px]:hidden` pattern, matches the mock's `data-el="savelabel"`/`savelabelshort` swap). Keep all existing disabled/loading logic (the `coverUploading`/`isSubmitting` guard from the Critical bug fix in the original review) — this task only touches the button's visibility/label, not its gating logic.
      Keep the blocked-state copy ("Add a title & elements") as a `title`/tooltip attribute on the button rather than replacing its label — swapping label text on disable would break the stable accessible-name e2e selectors noted in the original plan.

- [ ] **Step 2: Add back-button icon + title + live draft-status text to the sticky bar**
      Mock's bar: icon back-button (chevron, 38×38, matches the `BackButton` pattern used elsewhere e.g. `ResultScreen.tsx`/`PackDetailScreen`) + title text (`"New pack"` when creating, pack title when editing — reuse whatever title source `app/create/page.tsx`/`app/packs/[id]/edit/page.tsx` already pass in) + a subtitle `draftNote`: `"Draft · unsaved changes"` while the form is dirty, `"Draft · saved just now"` for ~2.2s after a successful draft save (see Step 3), otherwise omitted.
      Add a local `justSaved` boolean state (reset via `setTimeout` cleared on unmount) set true on save-draft success, false after 2200ms or on next edit.
      Shrink/remove the separate non-sticky `<h1>` block currently rendered above the form in `app/create/page.tsx` (lines ~26–35) and `app/packs/[id]/edit/page.tsx` (lines ~38–46) now that the title lives in the sticky bar — keep an `sr-only` `<h1>` for a11y/SEO if the page currently relies on a visible one for that purpose (check before removing).

- [ ] **Step 3: Add a "Saved" confirmation state to the save-draft button**
      Currently `create-pack.summary`/`messages/en.json` only has `"Save as draft"` → `"Saving draft…"` (loading) → navigates away. Mock wants idle `"Save draft"` (amber) ⇄ `"Saved"` (green, auto-reverts). Since the real save-draft action currently `router.push`es away on success (unlike the mock's local-only demo state), there's no window to show "Saved" — flag this to the reviewer as a real UX question: either (a) stop navigating away immediately on draft save and show "Saved" for ~1s first, or (b) skip this specific micro-state since the navigation makes it moot. Implement (a) if it doesn't conflict with existing e2e assertions on immediate navigation; otherwise implement copy-only (`"Save draft"` label, not `"Save as draft"`) and leave a comment explaining why the "Saved" flash isn't shown.

- [ ] **Step 4: Run tests, typecheck**
      `npm run test -- create` and `npx tsc --noEmit`. Fix any broken e2e/vitest selectors expecting the old two-button DOM shape.

- [ ] **Step 5: Commit**
      `git add src/features/create/CreatePackForm.tsx src/features/create/CreatePreviewPanel.tsx app/create/page.tsx "app/packs/[id]/edit/page.tsx" && git commit -m "refactor(create): consolidate sticky bar to one responsive-label submit button (T1)" -- src/features/create/CreatePackForm.tsx src/features/create/CreatePreviewPanel.tsx app/create/page.tsx "app/packs/[id]/edit/page.tsx"`

---

### Task 2: Replace aside panel with the submit checklist (feasibility panel explicitly OMITTED)

**Files:**

- Modify: `src/features/create/CreatePreviewPanel.tsx` (repurpose or replace — becomes the checklist panel; delete the cover-art/stats-table content this task removes)
- Test: `src/features/create/CreatePreviewPanel.test.tsx` (or wherever its tests live — check via Grep)

- [ ] **Step 1: Remove the LIVE PREVIEW cover-art + stats-table content**
      The mock's aside has NO cover thumbnail, no "LIVE PREVIEW" eyebrow, no Format/Pools/Elements/Rounds stat rows, no "No AI · no scoring rules to write" note — none of that exists in the real mock. Delete that content from `CreatePreviewPanel.tsx` (the Publish CTA was already removed in Task 1).

- [ ] **Step 2: Build the "Before you submit" checklist panel**
      Four rows, each a label + a filled/empty check indicator (reuse whatever check-icon treatment exists elsewhere, e.g. `ResultHero`'s checkmark circle style):
  - `Format chosen` — always `true` once a format is selected (it always is, by the time this panel is visible — format has a default).
  - `Title written` — `!!watch("title")?.trim()`.
  - `N pools with items` — count of pools with `items.length > 0`; label interpolates the count, e.g. `"3 pools with items"`.
  - `Cover image` — **do not port the mock's own hardcoded always-`false` stub** (its fake-data script never reads real cover state — looks like a placeholder in the mock itself). Wire it for real: `true` when `coverImageKey` is set OR `coverTone` differs from the field's default (whichever the form already treats as "a cover exists" — check `PackMetaFields.tsx`/`CoverImageField.tsx` for the existing truthy check and reuse it, don't invent a new one).
    This panel is purely derived from RHF state already in scope — no new data.

- [ ] **Step 3: Wire the panel into `CreatePackForm.tsx`'s aside slot**
      Replace whatever `CreatePreviewPanel` usage currently renders in the aside (~line 343–350) with the new checklist-only component (same file, repurposed, or rename if it reads clearer as e.g. `CreateChecklistPanel.tsx` — implementer's call, but if renaming, update all imports/tests in the same commit).

- [ ] **Step 4: Do NOT build the feasibility panel**
      Leave a one-line comment at the top of the checklist component noting the mock also has a "Friend modes unlocked" feasibility panel here that is deliberately not built (multiplayer rooms dormant) — so a future implementer doesn't wonder if it was missed.

- [ ] **Step 5: Update/add component tests, run them**
      `npm run test -- create`

- [ ] **Step 6: Commit**
      `git commit -m "refactor(create): replace preview panel with submit checklist (T2)" -- src/features/create/CreatePreviewPanel.tsx src/features/create/CreatePreviewPanel.test.tsx src/features/create/CreatePackForm.tsx`
      (adjust paths if renamed; use explicit pathspec — do not `git add -A`, other tasks may have files staged concurrently)

---

### Task 3: Section reorder + format tile order + format copy

**Files:**

- Modify: `src/features/create/CreatePackForm.tsx` (component order)
- Modify: `src/features/create/FormatSection.tsx` (tile order array, heading, hint)
- Modify: `messages/en.json` (format blurbs — 7 more locales in Task 8)

- [ ] **Step 1: Swap Basics/Format order**
      Mock order is `FORMAT → BASICS → POOLS → ROUNDS`. Shipped is `PackMetaFields(step 1, Basics) → FormatSection(step 2, Format) → ...`. Swap the two components' render order in `CreatePackForm.tsx` and swap their `StepHeader` `step` numbers (Format becomes step 1, Basics becomes step 2; Pools/Rounds stay 3/4).

- [ ] **Step 2: Fix format tile order**
      `FormatSection.tsx`'s array is currently `save_one, sacrifice_one, rank_blind, nxn, 1v1` with a comment claiming it matches "the mock" — that comment is about the stale mock. Real mock order: `save_one, sacrifice_one, 1v1, nxn, rank_blind`. Reorder the array to match; update/remove the stale comment.

- [ ] **Step 3: Update format section copy**
      Heading: replace the unconditional `"Elimination format"` (wrong for nxn/1v1, which aren't elimination) with the mock's neutral eyebrow-style `"Format"` (or whatever i18n key convention the rest of the step headers use — check `StepHeader.tsx` for how other sections title themselves and match it).
      Hint: replace `"Pick one. The element builder below changes to match it."` with wording carrying the mock's real information: format can't change after publish. E.g. `"How a round works. This can't change once the pack is published."` — this is new, useful information users currently don't get; don't drop it.
      Blurbs (`messages/en.json` `formatSection.blurb{SaveOne,SacrificeOne,1v1,Nxn,RankBlind}` or equivalent keys — check exact key names via Grep): reword all five to the mock's phrasing, e.g. `blurbSaveOne`: "A group each round — the player keeps exactly one." (adapt the remaining four similarly from the mock's per-format blurb text — re-fetch the mock's exact strings via DesignSync if the audit transcript above isn't verbatim enough).

- [ ] **Step 4: Run tests, typecheck**

- [ ] **Step 5: Commit**
      `git commit -m "refactor(create): reorder Format/Basics steps + format tiles, update copy (T3)" -- src/features/create/CreatePackForm.tsx src/features/create/FormatSection.tsx messages/en.json`

---

### Task 4: Rounds heading consistency + live round-count stepper

**Files:**

- Modify: `src/features/create/RoundsEditor.tsx`, `src/features/create/VersusEditor.tsx`, `src/features/create/RoundsToolbar.tsx`
- Modify: `messages/en.json`

- [ ] **Step 1: Unify Rounds heading/hint across both editors**
      `RoundsEditor.tsx` (elimination formats) uses heading "Rounds" + a hint about top-to-bottom draw order; `VersusEditor.tsx` (nxn/1v1) uses heading "Matchup" with no hint. Mock wants one consistent `"Rounds"` heading + hint `"Click a round to pick its pool"` for every format. Standardize both editors on this — the existing per-format hint content (draw-order explanation) can move into a tooltip or be dropped if it's genuinely redundant with the pool-picker UI itself; use judgment, but the heading+primary hint text must match across both editors.

- [ ] **Step 2: Add a live round-count stepper to `RoundsToolbar.tsx`**
      Currently a blank number `Input` + "Set for all" button with no live current-value display. Mock: a persistent header row showing the CURRENT shared round count with +/- stepper buttons, and an "Apply to all" button that turns amber/active whenever the rounds' actual counts have drifted apart (an `allMatch` check across `rounds` array items). Implement: derive current representative count (e.g. the first round's count, or "mixed" state) from RHF `rounds` field array, add +/- buttons that adjust a local pending value, keep "Apply to all" wired to the existing apply-to-all logic but visually flag (amber) when `!allMatch`.

- [ ] **Step 3: Run tests, typecheck**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(create): unify Rounds heading + add live round-count stepper (T4)" -- src/features/create/RoundsEditor.tsx src/features/create/VersusEditor.tsx src/features/create/RoundsToolbar.tsx messages/en.json`

---

### Task 5: Progressive disclosure — Pools (chip + expand-to-add/edit)

**Files:**

- Modify: `src/features/create/GroupItemList.tsx`, `src/features/create/GroupItemAdder.tsx`

- [ ] **Step 1: Make pool items read-only chips by default**
      Currently `GroupItemAdder.tsx` keeps one add/edit form permanently docked below every pool's chip list, and clicking a chip turns the docked form into an edit form for that chip. Mock: items are plain read-only chips; adding requires clicking a dashed `"+ Add item"` button that EXPANDS an inline panel (kind toggle, name/media fields, Cancel/Add buttons) which collapses back to the button after add/cancel. Editing a chip similarly expands an inline edit panel (Save/Cancel/Delete) anchored at/near that chip, not a single shared docked form.

- [ ] **Step 2: Implement expand/collapse local state**
      Add local UI state (`expandedFor: 'new' | itemId | null`) per pool section. Render the dashed `"+ Add item"` trigger when nothing is expanded; render the add-panel when `expandedFor === 'new'`; render the edit-panel inline near the clicked chip when `expandedFor === itemId`. Reuse existing field/validation logic from the current docked form — this is a presentation restructure, not new logic.

- [ ] **Step 3: Update the item-kind toggle label**
      `GroupItemAdder.tsx`'s `SegmentedControl` currently reads Text/Link/Image (`t("link")`); mock's toggle reads Text/**YouTube**/Image. Rename the `link` option's label (keep the underlying `type: 'youtube'` value/key as-is if that's already the internal type name — only the display label changes; check `PACK_ITEM_TYPES` or equivalent before assuming).

- [ ] **Step 4: Update/add tests for expand/collapse behavior, run them**

- [ ] **Step 5: Commit**
      `git commit -m "refactor(create): progressive-disclosure pool items (chip + expand) (T5)" -- src/features/create/GroupItemList.tsx src/features/create/GroupItemAdder.tsx`

---

### Task 6: Progressive disclosure — Rounds (collapsed rows, expand on click)

**Files:**

- Modify: `src/features/create/RoundsEditor.tsx`, `src/features/create/VersusEditor.tsx`

- [ ] **Step 1: Collapse rounds by default**
      Currently every round's full editor renders open at all times. Mock: each round renders collapsed — number + name + a one-line pool-summary + a chevron — and expands individually on click to reveal its full editor (pool picker, pinned-items config, etc.).

- [ ] **Step 2: Implement per-round expand/collapse state**
      Add local state (`expandedRoundId: string | null` or a `Set` if multiple can be open — check mock behavior; single-open-at-a-time is the simpler/likely-correct read given the mock shows one expanded row at a time, but confirm against the mock's actual demo state if ambiguous). Default: first round expanded or all collapsed — pick whichever reads better for a freshly-created pack with one round; note the choice in the commit message.
      Apply the same collapse/expand shape to `VersusEditor.tsx`'s matchup rows for consistency.

- [ ] **Step 3: Update/add tests for expand/collapse behavior, run them**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(create): collapse rounds by default, expand on click (T6)" -- src/features/create/RoundsEditor.tsx src/features/create/VersusEditor.tsx`

---

### Task 7: Copy bundle (tag picker, field labels/placeholders, misc button copy)

**Files:**

- Modify: `src/features/create/PackMetaFields.tsx`, `src/features/create/PoolsSection.tsx`, `src/features/create/RoundsEditor.tsx` (button copy only), `src/shared/components/TagPickerModal.tsx` (or actual path — Grep first)
- Modify: `messages/en.json`

- [ ] **Step 1: Tag picker copy**
      Update `TagPickerModal`'s title `"Select tags"` → `"Choose tags"`; count note `"{count} selected / {max}"` → `"{count} of {max} picked — remove one to swap"` (or equivalent honest phrasing); buttons `"Clear"` → `"Clear all"`, `"Apply"` → `"Done"`. Do NOT implement grouping (SCREEN/PLAY/CULTURE/SHAPE headers) or search in this task — `PACK_TAGS` isn't currently organized into categories and that's a bigger product call; copy-only here.

- [ ] **Step 2: Field label/placeholder wording**
      `PackMetaFields.tsx`: `"Pack title"` → `"Title"`, `"Pack description"` → `"Description"`; placeholders → mock's `"Save one anime protagonist"` / `"What makes this pack worth arguing over?"`.
      Pool name placeholder (`t("groupName")` = `"Pool {index} name"`) → plain `"Pool name"`.
      Button copy: `addPool` "+ Add pool" → "New pool"; `addRound` "+ Add round" → "New round" (verify this doesn't collide with Task 6's collapsed-row "+ Add round" trigger — same key is fine, just confirm placement still makes sense post-Task-6).

- [ ] **Step 3: Run i18n catalog test for English, full 8-locale pass happens in Task 8**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(create): align copy with real mock (tag picker, labels, buttons) (T7)" -- src/features/create/PackMetaFields.tsx src/features/create/PoolsSection.tsx src/features/create/RoundsEditor.tsx src/shared/components/TagPickerModal.tsx messages/en.json`
      (adjust TagPickerModal path per actual location found via Grep)

---

### Task 8: i18n × 8 locales + e2e + full gates + PR

**Files:**

- Modify: `messages/{uk,ru,ar,ur,hi,bn,zh}.json` (mirror every new/changed key from T1–T7)
- Modify: `e2e/create.spec.ts` or equivalent (fix any selectors broken by button consolidation, section reorder, or progressive disclosure)

- [ ] **Step 1: Translate every new/changed key from Tasks 1–7 into all 7 non-English locales**
      Preserve each locale's existing tone/register (check a few neighboring keys per locale first). Watch the documented ar/ur "sacrifice" religious-connotation trap when touching the `blurbSacrificeOne` key specifically.

- [ ] **Step 2: `npm run test -- catalogs` — confirm all locale JSON stays structurally valid and complete**

- [ ] **Step 3: Fix e2e selectors**
      Button consolidation (T1) removes one of two previously-selected Publish buttons — update any `getByRole` selector that disambiguated between them. Progressive disclosure (T5/T6) means items/rounds may need an explicit expand-click before their fields are queryable — update flows accordingly.
      Run: `npm run test:e2e -- create` (or the relevant spec file).

- [ ] **Step 4: Full local gates**
      `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.

- [ ] **Step 5: `pr-review-toolkit:code-reviewer` on the full branch diff**
      Fix any Critical/Important findings, re-review until clean.

- [ ] **Step 6: Open PR into `release/2.0.0`, self-merge per standing 2.0.0 authorization**
      State all gate results in the PR body (no CI runs on `release/*`). Delete the branch after merge.
