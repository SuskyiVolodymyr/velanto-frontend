# 2.0.0 — Create Pack screen redesign (slice plan)

Date: 2026-07-28
Mock (ground truth): `../../../design/extracted/design_handoff_vilante/screens/Vilante Create.dc.html`
Surfaces touched: `/create` **and** `/packs/[id]/edit` (both render `CreatePackForm`).
Branch: one feature branch off `release/2.0.0`, TDD, small commits, `pr-review-toolkit:code-reviewer` before the PR.

---

## 0. Scope boundary — read this first

This slice is **styling + layout only**. The create flow's behaviour is newer than the
mock and is _correct_; the mock is older than the pools/rounds redesign and encodes a
retired domain model.

### DO NOT TOUCH (functionally correct, out of scope)

| Area                                                                              | Files                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Zod contract + limits + per-format refinements                                    | `create-pack.schema.ts`, `create-pack.value-schemas.ts`, `create-pack.refinements.ts`                         |
| Format→round-family reshape effect, submit/PATCH, error mapping                   | `CreatePackForm.tsx` (the `useEffect`, `onValid`, `handleSubmit`)                                             |
| Enter-key submit suppression (deliberate; commented)                              | `CreatePackForm.tsx` `onKeyDown`                                                                              |
| Auth gate / edit-mode gates                                                       | `CreatePackForm.tsx` login gate, `EditPackScreen.tsx`, `EditPackFallback.tsx`                                 |
| Manual pin reservation, `availableItemIds`, `pinnedElsewhere`, random-pool option | `RoundsEditor.tsx`, `random-pool-option.ts`                                                                   |
| Versus per-side count / same-pool detection / draw resolution                     | `VersusEditor.tsx`, `round-draw.ts`                                                                           |
| Item draft state machine, YouTube validation, image upload/crop                   | `use-group-item-draft.ts`, `ItemImageCropModal.tsx`, `CoverCropModal.tsx`, `CoverImageField.tsx` upload logic |
| `pack-to-form-values.ts`, `create-pack.defaults.ts`                               | unchanged                                                                                                     |

### IN SCOPE (visual/structural)

Page shell + two-column layout, sticky action bar, numbered step headers, format-card
glyphs + selected states, Basics field labelling/spacing, pool card + item-chip +
add-row restyle, rounds/versus card restyle, and a **new** live-preview sidebar.

---

## 0b. Decision points (do NOT silently resolve these — confirm before implementing)

The mock predates the pools/rounds redesign. Four places where following it literally
would be a behaviour regression:

**D1 — The mock's Step 3/Step 4 model is the RETIRED one. Keep ours.**
The mock puts `selection: random|manual` + `sampleN` **on the group**, and derives
rounds ("N rounds — one per group") or exposes them as a bare slider. `CLAUDE.md` is
explicit: _"The pre-redesign vocabulary (categories, item tags, selectionMode/sampleSize
on a group) is gone — don't reintroduce it."_ Pools are named bags; rounds are separate
ordered entities with slots carrying `mode`/`count`/`itemIds`.
→ **Adopt the mock's visual language only.** Keep `PoolsSection` (Step 3) and
`RoundsEditor`/`VersusEditor` (Step 4) as separate, always-rendered sections for every
format. Do **not** implement the mock's three-mode Step-3 switch (`isGroups` / `isVersus`
/ `isPool`), the group-level Random/Manual toggle, the per-group sampleN input, or the
Step-4 range sliders.

**D2 — Two Publish buttons would break e2e strict mode.**
The mock has Publish in the header **and** in the preview panel. `e2e/create-pack.spec.ts`
does `getByRole("button", { name: "Publish" })` ~8 times; two matches = strict-mode
failure. Recommended resolution: the **preview panel is the single publish CTA on
desktop** (label `Publish pack` when enabled / `Add a title & elements` when blocked);
the **sticky action bar** carries `Cancel` + `Save draft` only, and gains a Publish
button only below the `lg` breakpoint where the preview panel has collapsed. Exactly one
Publish button in the accessibility tree at any viewport. If the implementer prefers two,
they must give them distinct accessible names _and_ update every e2e call site.

**D3 — Tags: mock shows 16 inline chips; we have 31 `PACK_TAGS`.**
An inline 31-chip wall is not the mock's composition. Recommended: keep
`TagPickerModal`, but restyle the _trigger area_ to the mock's row — selected tags render
as accent chips inline (removable, as today) with the `{n}/10 selected` counter to the
right, and a dashed `+ Add tags` chip opens the modal. Do not delete `TagPickerModal`.

**D4 — Fields the mock has no slot for must not be dropped.**
`language` (SelectField), `coverImageKey` (CoverImageField + crop), title/description
character counters, the click-a-chip-to-edit item flow, `RoundsToolbar` bulk-set, the
random-pool `Select` option, per-round name inputs, `roundUnderfill`/`versusSamePoolNote`
hints, and all inline zod error slots. Keep every one; place them in the mock's Step 1
(language + cover image, after Cover tone) and inside the restyled Step 3/4 cards.

Related: the mock's clipboard image paste (`onPaste` on the add-row wrapper) is a
**genuinely new interaction**, not a restyle. It is broken out as an optional task (T8) —
drop it if the slice is running long.

---

## Mock reference — extracted spec

Page container: `max-width:1280px; padding:40px 28px 90px`, `display:flex; gap:34px;
align-items:flex-start; flex-wrap:wrap`. Left builder `flex:1 1 540px; min-width:300px`,
column stack `gap:34px`. Right aside `flex:1 1 320px; max-width:380px;
position:sticky; top:88px; gap:16px`.

> Our equivalent of `max-width:1280px` is `PACK_CONTAINER` (`src/shared/lib/pack-container.ts`)
> — use it, do not hardcode a width. The mock's own `<header>` nav is replaced by the
> existing `AppShell` top bar + sidebar (same call the Pack Detail slice made in `35eef1e`).

Token mapping (never hardcode a hex — `.claude/docs/design-tokens.md`):

| Mock literal                             | Token / utility                                                      |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `#0a0b0e` page bg                        | `bg-background`                                                      |
| `rgba(255,255,255,.02)` card             | `bg-surface-card`                                                    |
| `rgba(255,255,255,.03)` field            | `bg-background` on a card (see `Input`)                              |
| `rgba(255,255,255,.07)` / `.09` hairline | `border-border`                                                      |
| `rgba(255,255,255,.14)` dashed           | `border-white/[0.14]` (as `EmptyState` already does)                 |
| `#f3f5f8` / `.5` / `.4` text             | `text-foreground` / `variant="secondary"` / `variant="tertiary"`     |
| `var(--acc) #00e5ff`                     | `text-acc` / `bg-acc` / `border-acc`                                 |
| `#ff6b6b`                                | `text-danger`                                                        |
| radius 8 / 11 / 14 / 18                  | `rounded-chip` / `rounded-control` / `rounded-tile` / `rounded-card` |

RTL: this screen must use logical properties throughout (`ms-`/`me-`, `ps-`/`pe-`,
`start`/`end`) — 3 of the 8 locales are RTL.

---

## Task list

Each task = one commit. Tests first (TDD) in every task that names a `.test.tsx`.

### T1 — `SwatchPicker`: gradient swatch variant (shared primitive)

**Files:** `src/shared/components/SwatchPicker.tsx`, `SwatchPicker.test.tsx`

Mock draws each cover-tone chip as `linear-gradient(150deg, {hex}, #0b0c0f)` at
`38×38`, `border-radius:10px`, `border:2px` (accent when selected, `rgba(255,255,255,.12)`
otherwise) and **no check glyph** — the border _is_ the selection cue.

Add an opt-in `swatchStyle?: "solid" | "gradient"` prop (default `solid`, so nothing else
changes). `gradient` renders the 150° fade-to-near-black, sizes to 38px, and swaps the
white ring + check for an accent 2px border. Keep `aria-pressed` and the `getLabel`
accessible name exactly as-is. Only call site today is `PackMetaFields`, so the default
branch has no consumer to regress — but keep the existing `solid` tests green.

New i18n: none.

### T2 — `StepHeader` (feature-local component)

**Files (new):** `src/features/create/StepHeader.tsx`, `StepHeader.test.tsx`

The mock's numbered section header, used 4×:

- Badge: `26×26`, `rounded-[8px]`, `bg-white/[0.06]`, `border-border`, `13px/600`,
  `text-foreground-secondary`, centred — content is the step number.
- Title: `<h2>` `18px/600`, `tracking-[-0.01em]`.
- Optional `aside` slot, `ms-auto`, `12.5px`, `variant="tertiary"` (used for
  "{n} items" on Step 3).
- Optional `hint` paragraph below: `13px`, `variant="tertiary"`, indented
  `ms-[37px]` (badge 26 + gap 11), `mb-[18px]`.
- Header→body gap is `18px` when there's no hint, `8px` when there is (the hint takes
  the remaining space).

Props: `{ step: number; title: string; aside?: ReactNode; hint?: string }`.
Test: renders an `h2` with the title, the step number, and the hint when passed.

New i18n: none (all strings passed in).

### T3 — Derivation: `create-pack.summary.ts`

**Files (new):** `src/features/create/create-pack.summary.ts`, `create-pack.summary.test.ts`

Pure module — no React — deriving everything the preview panel and the Publish gate
display, from `CreatePackValues`:

```
summarizePack(values) -> {
  elementCount   // sum of items across all pools
  poolCount      // values.groups.length
  roundCount     // values.rounds.length  (NOT the mock's derived/slider value)
  canPublish     // title.trim() && description.trim() && elementCount > 0
}
```

`canPublish` is a **display gate for the CTA label only** — it must _mirror_ the zod
schema's cheapest preconditions, never replace it. Submission still runs
`zodResolver(createPackSchema)`; the button stays clickable so a blocked submit surfaces
the real per-field errors rather than dead-ending. (The mock's `cursor:not-allowed`
disabled button is a design cue, not a hard disable — render it visually muted with
`aria-disabled`, not native `disabled`, matching the `JoinRoomCard` anon-gate precedent
from D1b-ii.)

Note `roundCount` differs from the mock: the mock derives rounds from group count in
groups-mode. Ours is authoritative (`rounds` is real state) — see D1.

Tests: empty draft, single pool with items, versus draft, and the `canPublish`
boundary in each direction.

### T4 — `FormatGlyph` + `FormatSection` restyle

**Files:** `src/features/create/FormatGlyph.tsx` (new), `FormatSection.tsx`,
`FormatSection.test.tsx` (new — there is no test today)

Glyphs (pure CSS shapes, `26px` tall, `aria-hidden`; accent = selected, else
`text-foreground-secondary` at `.7`; "mute" spans always `rgba(243,245,248,.16)`):

| Format          | Glyph                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------ |
| `save_one`      | 3 squares `16px`, middle `16×22`, `align-items:flex-end`, gap 6 — middle is the accent one |
| `sacrifice_one` | 3 squares `16px`, first two accent, third muted with a `14×2` `#ff6b6b` bar rotated 45°    |
| `rank_blind`    | 3 stacked bars `26/20/14 × 4px`, radius 3, gap 4 — first accent                            |
| `nxn`           | 2×2 grid of `14px` squares, gap 5 — the diagonal pair accent                               |
| `1v1`           | `18px` square + `vs` (`11px`, `text-foreground-tertiary`) + `18px` square, gap 8           |

Card: `padding:16px`, `rounded-tile` (14), `flex-col gap-12px`, `text-align:start`.
Selected → `bg-white/[0.055]` + `border-acc`; unselected → `bg-surface-card` +
`border-border`. Title `15px/600`; blurb `12.5px`, `variant="secondary"`,
`leading-[1.45]`, `mt-[3px]`.

Grid: `grid-template-columns: repeat(auto-fill, minmax(215px,1fr)); gap:12px`
(replaces the current `grid-cols-2 sm:grid-cols-3`).

**Reorder `FORMAT_OPTIONS` to the mock's order:** `save_one`, `sacrifice_one`,
`rank_blind`, `nxn`, `1v1` (today `nxn` and `rank_blind` are swapped). This shifts
`nth()` indices in e2e — see T11.

Keep `aria-pressed` + `setValue("format", …)` untouched.

Header (via `StepHeader` step 2): title `create.formatHeading` — **change copy from
"Format" to "Elimination format"**; hint `create.formatHint` = "Pick one. The element
builder below changes to match it."

New/updated i18n (all 8 locales):

- `create.formatHeading` → "Elimination format" (update)
- `create.formatHint` → "Pick one. The element builder below changes to match it." (new)
- `create.blurbRankBlind` → "Place each pick blind into a growing list." (update)
- `create.blurbNxn` → "Two groups compared side by side." (update — drops the retired
  word "categories")
- `create.blurb1v1` → "Head-to-head pairs, no bracket." (update)
- `create.blurbSaveOne` / `blurbSacrificeOne` already match the mock exactly — leave.

Test: renders 5 cards in mock order, `aria-pressed` follows the watched `format`,
clicking sets it.

### T5 — `CreatePreviewPanel` (the right sidebar — the biggest new surface)

**Files (new):** `src/features/create/CreatePreviewPanel.tsx`, `CreatePreviewPanel.test.tsx`

A client component reading form state via `useWatch` (title, description, coverTone,
coverImageKey, format) plus `summarizePack` (T3) and `useAuth` for the author line.
Column stack, `gap:16px`, `lg:sticky lg:top-[82px]`, `max-w-[380px]`.

**a. Eyebrow** — `LIVE PREVIEW`, `12px/500`, `tracking-[0.14em]`, `variant="tertiary"`.

**b. Cover preview card** — `rounded-[16px] overflow-hidden bg-surface-card border-border`:

- Cover: `aspect-[4/3]`, `background: linear-gradient(158deg, {coverTone}, #0b0c0f 76%)`.
  When `coverImageKey` is set, render `<CoverImage>` beneath the scrim (same as
  `PackCoverBanner`) — the mock has no cover-image case, this is the D4 carry-over.
- Two `aria-hidden` overlays: the diagonal hairline texture
  (`repeating-linear-gradient(122deg, rgba(255,255,255,.028) 0 1px, transparent 1px 15px)`)
  and the bottom scrim (`linear-gradient(0deg, rgba(9,10,13,.72), transparent 52%)`).
- Top-start pill: the format short label — reuse `formats.{format}` with CSS `uppercase`
  and `tracking-[0.1em]`; style as `Badge variant="overlay"` at `10.5px`. **No new keys**
  (the mock's hardcoded "SACRIFICE"/"RANK BLIND" shorts would cost 40 translations for
  a purely typographic effect; CSS `uppercase` is a correct no-op in zh/ar/ur).
- Top-end: `{n} rounds`, `11px`, `text-foreground-secondary`.
- Bottom: title, `20px/600`, `leading-[1.08]`, `text-white/95`. **Empty state:** falls
  back to `create.preview.untitled` = "Untitled pack".
- Body `p-[15px_16px_16px]`: description line `13px`, `variant="secondary"`,
  `min-h-[20px]`; **empty state** `create.preview.noDescription` = "Add a short
  description…". Then the author row: `17px` rounded chip filled with `coverTone` +
  the signed-in `@username` (mock hardcodes `@you`; use the real user — `useAuth`).

**c. Summary panel** — `rounded-tile bg-surface-card border-border p-[16px_18px]`, four
rows `flex justify-between py-2`, hairline `border-b border-border` on all but the last.
Rows: `Format` → `formats.{format}`; `Pools` → `poolCount`; `Elements` → `elementCount`;
`Rounds` → `roundCount`. Values `13px/500`, `tabular-nums`.
(Mock says "Groups"/"Pool" switched by mode; we always say **Pools** — D1.)

**d. Publish CTA** — `h-[48px] rounded-[12px] w-full`. Enabled: `bg-acc`,
`text-[#0a0b0e]`, `font-semibold`, label `create.preview.publishReady` = "Publish pack".
Blocked: `bg-white/[0.04] border-border text-foreground-tertiary`, `aria-disabled`,
label `create.preview.publishBlocked` = "Add a title & elements". In **edit mode** the
label is the existing `create.saveChanges` / `create.saving` — pass `mode` in as a prop
rather than re-reading it.

**e. Footer note** — centred row, `12px`, `variant="tertiary"`: a `6px` accent dot with
`animate-livedot` (the existing keyframe — do **not** add the mock's `softBlink`) +
`create.preview.noAiNote` = "No AI · no scoring rules to write".

New i18n (all 8 locales), nested under `create.preview.*` following the `home.card.*`
precedent from D1b-ii:
`eyebrow`, `untitled`, `noDescription`, `roundsCount` (ICU plural), `format`, `pools`,
`elements`, `rounds`, `publishReady`, `publishBlocked`, `noAiNote`.

Tests: title/description empty-state fallbacks, counts from a seeded form, blocked vs
ready CTA label + `aria-disabled`, edit-mode label. Use `renderWithIntl` and wrap in a
`FormProvider` — see the test-provider gotcha in the React Query notes; `CreatePackForm.test.tsx`
already has the harness to copy.

### T6 — Basics (Step 1) restyle

**Files:** `src/features/create/PackMetaFields.tsx`, `CreatePackForm.test.tsx` (label updates)

Structure per mock: `flex-col gap-[14px]`, each field = a visible label above the control
(`12.5px/500`, `text-foreground-secondary` at `.5`, `mb-[7px]`) — **replacing the current
`srOnlyLabel` + placeholder-as-label pattern** on title and description.

- **Pack title** — visible label `create.packTitle`; placeholder becomes
  `create.titlePlaceholder` = "e.g. Anime Openings by Year". Input `h-[46px]`,
  `rounded-control`, `px-[15px]` — this is already `Input`'s default; just drop
  `srOnlyLabel`.
- **Short description** — `Textarea rows={2}` (mock; today 3), placeholder
  `create.descriptionPlaceholder` → update copy to "One line about the theme".
  ⚠ **Keep the accessible name string `"Pack description"` unchanged** — `e2e/create-pack.spec.ts`
  and `edit-pack.spec.ts` both use `getByLabel("Pack description")`. Same for
  `"Pack title"`. If you change either, T11 must update every call site.
- Character counters stay (`self-end text-xs tabular-nums`) — D4.
- **Cover tone** — `SwatchPicker swatchStyle="gradient"` (T1).
- **Cover image** + **Pack language** — keep, placed after Cover tone, restyled to the
  same label-above-field rhythm. `CoverImageField`'s upload/crop logic untouched.
- **Tags** — label row with `ms-auto` counter `create.tagsCount` = "{count}/{max}
  selected" (mock: "2/10 selected"; today "2/10" bare). Selected tags render as the
  mock's chips: `7px 13px`, `rounded-[9px]`, `13px/500`, `bg-acc/[0.14] text-acc
border-acc`, with the existing `×` remove. Add a dashed `+ Add tags` chip opening
  `TagPickerModal` (replaces the current secondary `Button`). See D3.

Header: `StepHeader` step 1, title `create.basicsHeading` ("Basics", unchanged).

New/updated i18n: `create.titlePlaceholder` (new), `create.descriptionPlaceholder`
(update), `create.tagsCount` (new), `create.addTags` (new, "+ Add tags").

### T7 — Pools (Step 3): `GroupEditor` / `GroupItemList` / `PoolsSection` restyle

**Files:** `PoolsSection.tsx`, `GroupEditor.tsx`, `GroupEditor.test.tsx`,
`GroupItemList.tsx`, `GroupItemAdder.tsx`

- **Section header** — `StepHeader` step 3, title `create.poolsHeading` ("Pools"),
  `aside` = total item count across pools via `create.itemCount` (existing ICU plural),
  `hint` = **new copy, ours not the mock's** (the mock's hint describes the retired
  group-owns-drawing model): `create.poolsHint` = "Pools are reusable bags of items.
  The rounds below decide which pool each round draws from."
- **Pool card** — `bg-surface-card border-border rounded-tile p-[15px] gap-[13px]`.
  Header row gains the mock's `5×24` accent bar (`rounded-[3px] bg-acc opacity-55`,
  `aria-hidden`) before the name input. Name input `h-[38px] rounded-[9px] font-semibold
text-[15px]`. Remove button becomes the mock's `34×34` icon button (`×`,
  `border-border`, hover `text-danger border-danger/40`) — **keep the existing
  `aria-label` (`create.removeGroup`)** so it stays reachable by name.
- **Item chips** (`GroupItemList`) — `gap-[7px]`; chip `p-[5px_9px] rounded-chip
bg-white/[0.04] border-border text-[13px]`. **New:** a `30×22` `rounded-[5px]`
  thumbnail slot before the label for `youtube`/`image` items, with the mock's white
  play-triangle overlay on YouTube (CSS border triangle, `aria-hidden`). Keep the
  click-to-edit button and the `×` (`18×18`) with their existing aria labels; keep the
  dimmed `editing` state.
- **Add row** (`GroupItemAdder`) — the Text/Link/Image toggle becomes the shared
  `SegmentedControl` (`12.5px`, `p-[5px_12px]`, `rounded-[9px]` shell) instead of the
  hand-rolled `aria-pressed` buttons; the commit button takes the mock's accent-tint
  style (`text-acc`, `bg-acc/[0.12]`, `border-acc/30`). ⚠ Keep the button's accessible
  name `"Add"` exactly — e2e clicks `getByRole("button", { name: "Add", exact: true })`
  and `.nth(1)`.
- **Footer info** — `12px variant="tertiary"`, existing `create.itemCount`.
- **Empty pool** — mock's dashed placeholder, via the shared `EmptyState`:
  `create.poolEmpty` = "No elements yet — add your first above."
- **Add-pool button** — dashed full-width, `h-[46px] rounded-[12px] border-dashed
border-white/[0.14]`, hover `border-acc`. ⚠ Keep the label string `"+ Add pool"`
  (`create.addPool`) — e2e clicks it by name.

New i18n: `create.poolsHint`, `create.poolEmpty`.

### T8 — (OPTIONAL) clipboard paste-to-add-image

**Files:** `GroupItemAdder.tsx`, `use-group-item-draft.ts`, `use-group-item-draft.test.tsx`

The mock wires `onPaste` on the add-row wrapper: pasting an image from the clipboard
switches the type toggle to Image and loads the file. Genuinely new behaviour, so it is
its own task and its own commit — and the first thing to cut if the slice is running long.
Must route through the existing `selectImageFile` path so the size/type validation and
the 16:9 crop modal still apply. Hint copy `create.pasteImageHint` = "or paste an image
from your clipboard", shown beside the Upload button.

New i18n: `create.pasteImageHint` (only if this task ships).

### T9 — Rounds (Step 4): `RoundsEditor` / `VersusEditor` / `RoundsToolbar` restyle

**Files:** `RoundsEditor.tsx`, `VersusEditor.tsx`, `RoundsToolbar.tsx`, and their tests

Restyle only — every handler, guard and hint in these two files is D1-protected.

- Section header via `StepHeader` step 4, `create.roundsHeading` ("Rounds") /
  `create.matchupHeading` ("Matchup"), with a hint: `create.roundsHint` = "Rounds play
  top to bottom. Each round draws from one pool — at random, or from items you pin."
  (**ours, not the mock's** derived-count copy).
- Round cards: same surface treatment as the pool cards (`bg-surface-card`,
  `rounded-tile`, `p-[15px]`, `gap-[13px]`); drop the leftover
  `hover:translate-y-0 hover:shadow-none` overrides now that `Card` is non-interactive
  by default.
- Random/Manual toggle → shared `SegmentedControl` (same swap as T7), keeping the
  per-round `aria-label`s.
- Count inputs adopt the mock's accent-value styling (`54×38`, `text-acc`,
  `font-semibold`, `text-center`, `tabular-nums`).
- Add-round button → the same dashed full-width treatment as `+ Add pool`; the bulk
  "set for all" group keeps its `shrink-0` wrap fix (see the `RoundsToolbar` comment —
  do not undo it).
- Inline hints (`roundDraws`, `roundUnderfill`, `versusDrawHint`, `versusSamePoolNote`)
  and error slots stay exactly where they are.

New i18n: `create.roundsHint`.

### T10 — Layout wiring: page shell + sticky action bar

**Files:** `app/create/page.tsx`, `app/packs/[id]/edit/page.tsx`,
`src/features/create/CreatePackForm.tsx`, `CreatePackForm.test.tsx`

- Swap `max-w-5xl` for `PACK_CONTAINER` on `/create` (the edit page already uses it).
- **Sticky action bar** above the content, mirroring `PackDetailScreen`'s pattern
  (`sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md`):
  `Cancel` link on the start side (replaces `BackButton`; href `/` on create,
  `/packs/{id}` on edit — new key `create.cancel`), `Save draft` + (below `lg`) Publish
  on the end side. See **D2**.
- **Page header block** stays above the two columns: `h1` `pages.createTitle`
  (`clamp(30px,3.6vw,40px)/600`, `tracking-[-0.02em]`) + subtitle
  `pages.createSubtitle` — **update the copy to the mock's**: "Pick an elimination
  format — the builder adapts to it. Elements can be text, a YouTube link, or an image."
  (today's string omits images). `max-w-[520px]`.
- **Two-column body** in `CreatePackForm`: `flex gap-[34px] items-start flex-wrap`
  → builder column `flex-1 basis-[540px] min-w-[300px] flex-col gap-[34px]`, aside
  `flex-1 basis-[320px] max-w-[380px]`. Follow `PackDetailScreen`'s DOM-order trick:
  put the preview aside **first in the DOM with `lg:order-2`** so that on mobile it
  stacks above the builder and reading order matches visual order — _unless_ the
  preview reads better below on mobile, in which case it goes second in the DOM and
  keeps `order` untouched. Pick one and comment why.
- Section order inside the builder column: `PackMetaFields` (1) → `FormatSection` (2) →
  `PoolsSection` (3) → `RoundsEditor`/`VersusEditor` (4). Unchanged from today; only
  the numbering is new.
- The current bottom `[Save as draft | Publish]` row is **removed** — those actions now
  live in the sticky bar and the preview panel. `submitMode`, `coverUploading` and the
  spinner labels move with them, unchanged.
- `errors.root` alert keeps a slot in the builder column (mock has none — do not drop it).
- The `status === "unauthenticated"` login gate renders before all of this, as today.

New i18n: `create.cancel`; updated `pages.createSubtitle`.

### T11 — i18n catalogs (8 locales) + tests + gates + PR

**Files:** `messages/{ar,bn,en,hi,ru,uk,ur,zh}.json`, `e2e/create-pack.spec.ts`,
`e2e/edit-pack.spec.ts`, all touched `*.test.tsx`

**i18n.** Add every key above to all 8 catalogs — real translations, not transliterated
placeholders. Two specific traps, both burned before:

- **`create.preview.roundsCount` / `create.itemCount` are ICU plurals.** ar and ru/uk
  need their full form sets (`zero/one/two/few/many/other` for ar; `one/few/many/other`
  for ru/uk). Mirror the plural forms from an _existing_ count-noun in the same catalog
  rather than inventing them (this is exactly what `auth.brand.socialProof` had to be
  fixed for in `386d06c`).
- **ar/ur connotation.** Do not re-translate the existing format names — `sacrifice_one`
  in Arabic/Urdu already has a vetted rendering; the obvious literal (تضحية / قربانی)
  reads as _religious sacrifice_ (Qurbani/Eid al-Adha), which is why it was fixed once
  already. Copy the existing `formats.sacrifice_one` value verbatim. For the new
  `create.preview.noAiNote`, avoid a literal "no AI" that reads as a denial of
  intelligence; phrase it as "no AI involved / no scoring rules to write".
- Run the catalogs-parity check (the `LOCALES` ↔ `messages/*.json` invariant is asserted
  in `src/shared/types/cross-repo-drift.test.ts`).

**Vitest.** New: `StepHeader.test.tsx`, `FormatSection.test.tsx`,
`create-pack.summary.test.ts`, `CreatePreviewPanel.test.tsx`. Updated:
`CreatePackForm.test.tsx` (button locations, visible labels), `GroupEditor.test.tsx`,
`RoundsEditor.test.tsx`, `VersusEditor.test.tsx`, `SwatchPicker.test.tsx`.

**Playwright.** `e2e/create-pack.spec.ts` + `e2e/edit-pack.spec.ts` need a pass —
this slice changes UI _and_ copy, so per the repo's e2e rule they are not optional:

1. **Publish button ambiguity** (D2) — the single highest-risk break. Verify exactly one
   `getByRole("button", { name: "Publish" })` match at the test viewport, or retarget.
2. **Format-card reorder** (T4) — any `.nth()` over the format grid shifts;
   `getByRole("button", { name: /^NxN/ })` still works, prefer the name form.
3. **`Add` / `+ Add pool` / `Pool N name` / `Pack title` / `Pack description` accessible
   names** — the plan deliberately keeps all of these stable; assert that they still
   resolve after the restyle rather than assuming.
4. New assertion worth adding: the live-preview panel reflects a typed title.

**Gates** (no CI runs on `release/*` — everything is local):
`npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run test:e2e` ·
production `next build` · catalogs parity. Then
`pr-review-toolkit:code-reviewer`, plus `ui-guardian` for the design-token/a11y pass
given how much of this slice is new markup. PR into `release/2.0.0` (self-merge is fine
per the release-branch rule — **never** open this against `develop`/`main` without asking).

---

## Deferred / adapted (state these explicitly in the PR body)

- The mock's group-level Random/Manual + `sampleN`, its derived "N rounds — one per
  group" panel, and its Step-4 range sliders — **retired model, not implemented** (D1).
- The mock's three-mode Step 3 (`groups`/`versus`/`pool`) — our Pools + Rounds split
  covers every format with one structure (D1).
- The mock's second Publish button (D2).
- The mock's 16-chip inline tag row — we have 31 tags, so the picker modal stays (D3).
- The mock's `@you` placeholder author → real signed-in username.
- Clipboard image paste (T8) if cut.
- The mock's `softBlink` keyframe → the existing `animate-livedot`.
