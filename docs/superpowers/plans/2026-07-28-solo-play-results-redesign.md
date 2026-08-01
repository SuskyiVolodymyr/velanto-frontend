# 2.0.0 — Solo Play + Results redesign (slice plan)

Date: 2026-07-28
Mocks (ground truth), all under `../../../design/extracted/design_handoff_vilante/screens/`:

| Mock                        | Drives                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Vilante Play.dc.html`      | the elimination round body (`save_one` / `sacrifice_one`) **and** the chrome every play screen shares |
| `Vilante Play NxN.dc.html`  | the `nxn` two-side round body                                                                         |
| `Vilante Play 1v1.dc.html`  | the `1v1` head-to-head round body                                                                     |
| `Vilante Play Rank.dc.html` | the `rank_blind` place-a-card round body + its between-rounds interstitial                            |
| `Vilante Result.dc.html`    | all four result screens                                                                               |

Surfaces touched: `/packs/[id]/play` (all five formats, three screens) and
`/packs/[id]/result` (four screens + locked/error/shared states).
Branch: one feature branch off `release/2.0.0`, TDD, small commits,
`pr-review-toolkit:code-reviewer` before the PR.

**The four play mocks are ~60% one screen.** Nav bar, progress rail, eyebrow +
title block, "Report this round" pill + modal, the COMPLETE section, the confirm
button and all three media treatments (text tile / image tile / video tile) are
byte-for-byte identical across the four files. What genuinely differs is the
**round body** — a wrapping card grid, two side panels, two big cards, or a
slot grid. The task list is cut along that seam: T1–T3 + T8 are the shared
chrome, written once; T4–T7 are the four round bodies. Do not re-spec chrome
inside a format task.

---

## 0. Scope boundary — read this first

This slice is **styling + layout only**. Unlike Create Pack, the play/result
_domain_ model in the code is current and correct — pools and rounds, slots,
seeded resume, the recorded-pick shapes. But the mocks predate four deliberate
behavioural decisions (§0b D1–D3, D5), and following them literally would
regress each one.

### DO NOT TOUCH (functionally correct, out of scope)

| Area                                                                                                                     | Files                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Deterministic-replay infrastructure (2026-07)                                                                            | `seeded-rng.ts`, `pack-structure-hash.ts`, `play-resume-storage.ts`, `use-play-resume.ts` |
| The draw engine (manual pins, cross-round dedup, random shuffle)                                                         | `round-sampling.ts`, `use-round-selections.ts`                                            |
| The elimination/nxn state machine, `resolvePicks` shapes, record-on-finish                                               | `use-play-session.ts` in full                                                             |
| Rank placement + per-round `RecordedPick` build (`position` / `drawIndex`)                                               | `RankPlayScreen.tsx` `place()`, `goToNextRound()`, both effects                           |
| 1v1 pick recording (both contenders, `chosen` on the winner)                                                             | `HeadToHeadPlayScreen.tsx` `confirmPick()`, both effects                                  |
| Format→screen routing + the `never` exhaustiveness gate                                                                  | `PlayRouter.tsx`                                                                          |
| Resume restore blocks (`restoredRef`, the eslint-disabled `setState`-in-effect)                                          | all three play screens                                                                    |
| `scroll-to-round-top.ts` and its nxn-only call site                                                                      | untouched                                                                                 |
| The #222 evidence gate, #243 fetch-where-displayed                                                                       | `ResultScreen.tsx`, `use-result-picks.ts`, `ResultFallback.tsx`                           |
| Every `playedRounds` / `playedMatchups` rebuild (side boundary from `chosen`, title-from-pack, the `seen ?? 1` fallback) | `EliminationResultScreen.tsx`, `NxNResultScreen.tsx`, `HeadToHeadResultScreen.tsx`        |
| Competition ranking, medal pairing, `RankCell` border-per-cell                                                           | `result-table.tsx`                                                                        |
| `TopPickedTable` / `PodiumTable` **ProgressBar decoration** — already landed in `fceea18`, do not re-propose             | both files                                                                                |
| `roundHeading()` precedence (#355)                                                                                       | `src/shared/lib/round-heading.ts`                                                         |

### IN SCOPE (visual/structural)

A shared sticky play bar (round counter + Exit + progress rail) replacing
`PlayHeader` + `PlayProgress`; a shared round-header block (live dot eyebrow +
title + instruction); the four round-body restyles; the picks-so-far chip row;
the result page's sticky action bar, hero + stat tiles, restyled per-round
recap rows, and a new footer CTA panel. Plus one genuinely new, optional
surface: the report-this-round modal (T9).

---

## 0b. Decision points (do NOT silently resolve these — confirm before implementing)

**D1 — The mock's progressive reveal is a RETIRED mechanic. Do not reintroduce.**
All four play mocks carry `Showing {revealed} of {total}`, a `Show next` /
`Show all` button pair, and a confirm gated on `revealed >= total` ("Show all
items to continue"). Commit `4ff2462` deleted exactly this — `RoundRevealControls`,
the `revealed`/`revealNext`/`revealAll`/`canRevealMore` surface on
`usePlaySession`, and the `play.showingOf`/`showNext`/`showAll` keys in every
catalog — replacing it with "render every candidate immediately, staggered by
`.play-card-appear`". `e2e/play.spec.ts` asserts the _absence_ of that control
twice (`getByRole("button", { name: "Show all" })).toHaveCount(0)`).
→ **Adopt the mock's card visuals only.** No reveal controls, no "Showing X of
Y" line, no reveal gate on confirm. Confirm stays gated on selection alone.

**D2 — The mock's "All groups done" COMPLETE section does not exist for us.**
Every play screen redirects to `/packs/{id}/result` as soon as the record
settles (`recordSettled` → `router.replace`), showing `LoadingState` in the
gap. That is commented as deliberate in all three screens ("no interstitial
'all rounds done' step") and `e2e/play.spec.ts` asserts the redirect.
→ Do **not** build the mock's COMPLETE block, its pick recap, or its "See your
result" CTA on any of the four screens. Style the `LoadingState` gap instead.
**Exception:** `rank_blind`'s _ROUND COMPLETE_ interstitial (mock lines 96–117)
is real and ships today — that one gets restyled (T7), it is not the same thing
as the mock's terminal COMPLETE section.

**D3 — 1v1 click-to-advance vs select-then-confirm. Keep confirm.**
`Vilante Play 1v1.dc.html` advances the moment a card is clicked (`onSelect` →
`pick(side)` → `matchIndex + 1`). Ours holds the selection as an `aria-pressed`
toggle and requires the confirm button — a documented, deliberate change
("these are now toggles that hold a selection until it's confirmed, not
controls that act on click", `HeadToHeadRound.tsx`). One misclick in the mock's
model is an unrecoverable recorded pick.
→ Keep the confirm step and `aria-pressed`. Adopt the mock's card _proportions_
(radius 20, 230px media, centred 18px label, 48px VS circle) only.

**D4 — Play chrome: AppShell stays, the mock's own `<header>` does not.**
Each mock ships a standalone nav (brand mark + progress label + Exit) because
each mock is a standalone file. The Pack Detail slice (`35eef1e`) and the
Create Pack plan both settled this: the mock's nav is replaced by the existing
`AppShell` top bar + sidebar, and only the screen-specific controls become a
sticky sub-bar. Making `/packs/[id]/play` a full-screen route instead is a
_different, larger_ decision — it means editing `AppShell.isFullScreenRoute`
(today `/auth` only), the `MobileBottomNav` bottom-padding branch, and the
drawer, for every play screen at once.
→ **Default: keep AppShell.** The progress rail, round counter and Exit link
become `PlayChrome`, a sticky bar beneath the top bar (T2). If the reviewer
wants a distraction-free play mode, file it as its own slice.

**D5 — The result mock's headline statistic is the one #336 deleted as misleading.**
`Vilante Result.dc.html` builds its three hero tiles _and_ the per-pick bars in
"YOUR PICKS" out of `pct` = "share of all players who picked the same thing in
this round". `EliminationResultScreen` documents why that number is gone:
`count / totalPlays` caps a rarely-drawn item at how often the draw _surfaces_
it and lists never-drawn items at 0%. `NxNResultScreen` documents a second,
independent reason percentages can't exist for `nxn` (a set-vs-set pairing
almost never repeats — #333).
→ Recommended resolution, per format, derived in `result-summary.ts` (T10):

| Format                               | Hero tiles                                                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `save_one` / `sacrifice_one` / `1v1` | agreement + most-popular pick + rarest pick, all computed from **`ItemTally.percentage`** (`picked / appeared`) — the honest denominator, already shipped in `topItems` |
| `nxn`                                | **no percentages, ever.** Plays recorded + rounds you played + items you saw                                                                                            |
| `rank_blind`                         | rounds ranked + items placed + podium entries. No agreement number (`RankResults` has no per-pick share)                                                                |

Tiles render only when the numbers exist (`topItems` empty → hide the row, not
show zeros). Do **not** resurrect `RoundResultItem.percentage` for this.

**D6 — The mock's flat "YOUR PICKS · ONE PER GROUP" list + All/Rare filter.**
Ours is a per-round recap of the _slate you were shown_ with your pick marked,
and it is format-specific (elimination slate / nxn two sides / 1v1 contender
pair / rank ordering). It is strictly richer than the mock's one-row-per-pick
list, and the mock's list is keyed on the D5 statistic.
→ Keep our recap. Adopt the mock's **row rhythm** (single-line rows, hairline
container, meta right-aligned and tabular). Drop the All/Rare segmented filter
and the POPULAR/RARE chips unless D5 resolves in favour of per-pick shares —
they filter on a number we won't have.

**D7 — "Report this round" is a new feature, not a restyle.**
All four play mocks carry the pill + modal. The backend supports it
(`reportsClient.create({ type: "round", targetId, roundIndex, … })`) and
`REPORT_REASON_LABELS.round` already holds the four reason ids, sourced from
these very mocks. But **no user-facing report UI ships anywhere in the app
today** — only the moderation panel consumes reports, and
`REPORT_REASON_LABELS` is hardcoded English (a moderator-facing string). Adding
this modal means translating four reason labels + six modal strings into 8
locales.
→ Its own optional task (**T9**), and the first thing to cut if the slice runs
long.

Related, not a decision: the mocks' `<video>` hover-preview tile is placeholder
art. Our youtube items render a real `YouTubeCard` embed. Keep it, and do **not**
increase the number of embeds a round mounts — see the YouTube-embed-throttle
note in the reference docs.

---

## Mock reference — the shared chrome, extracted once

Identical in all four play mocks:

- **Nav bar** — `position:sticky; top:0`, `backdrop-filter:blur(18px)`,
  `background:rgba(10,11,14,.72)`, `border-bottom:1px solid rgba(255,255,255,.06)`.
  Row: brand · spacer · `{progressLabel}` (`13.5px`, `.5` alpha,
  `font-variant-numeric:tabular-nums`) · `Exit` (`13.5px/500`, `.55` alpha,
  `padding:8px 14px`, `radius:9px`, hover lightens).
- **Progress rail** — directly beneath the nav row, full-bleed:
  `height:3px; background:rgba(255,255,255,.06)`, fill `background:var(--acc)`,
  `transition:width .4s ease`.
- **Eyebrow** — `6px` accent dot with `softBlink 2.4s` + label at `12.5px/500`,
  `letter-spacing:.16em`, `color:rgba(243,245,248,.42)`, gap `9px`.
- **Round title** — `clamp(30px,4.2vw,44px)` generic / `clamp(26px,3.6vw,36px)`
  nxn / `clamp(24px,3.2vw,32px)` 1v1, `600`, `line-height:1.05–1.1`,
  `letter-spacing:-.02em`.
- **Instruction line** — `14.5px`, `.5` alpha.
- **Confirm** — `height:52px; padding:0 30px; radius:13px; 15.5px/600`; enabled
  = accent fill + near-black text; disabled = `rgba(255,255,255,.06)` fill,
  `.35` text, `cursor:not-allowed`.
- **Media treatments** (three, used by every format at different heights —
  150px generic/rank, 110px nxn, 230px 1v1):
  - text → `linear-gradient(158deg, {tone}, #0b0c0f 78%)` + an `aria-hidden`
    diagonal hairline overlay
    `repeating-linear-gradient(122deg, rgba(255,255,255,.03) 0 1px, transparent 1px 15px)`
  - image → `repeating-linear-gradient(135deg, {tone}, {tone} 11px, #0b0c0f 11px, #0b0c0f 22px)`
    (placeholder art — we render the real `ImageCard`)
  - video → placeholder (we render the real `YouTubeCard`)
- **Alignment is the one chrome-level per-format difference**: the generic
  elimination screen is start-aligned; nxn, 1v1 and rank centre the whole header
  block.

> Our equivalent of the mocks' `max-width:1040px` is `PACK_CONTAINER`
> (`src/shared/lib/pack-container.ts`) — use it, do not hardcode a width, and
> do not narrow 1v1 to the mock's 900px (the container is deliberately shared
> across every pack surface; see its doc comment).

Token mapping (never hardcode a hex — `.claude/docs/design-tokens.md`):

| Mock literal                                      | Token / utility                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `#0a0b0e` page bg                                 | `bg-background`                                                                               |
| `#0b0c0f` media-tile bg / gradient terminator     | `bg-background` / `var(--background)` inside the inline gradient                              |
| `rgba(255,255,255,.02)` / `.025` panel            | `bg-surface-card`                                                                             |
| `rgba(255,255,255,.03)`–`.06` control fill        | `bg-white/[0.04]` on a card, or `bg-surface-raised`                                           |
| `rgba(255,255,255,.06)`–`.09` hairline            | `border-border`                                                                               |
| `rgba(255,255,255,.12)`–`.14` dashed              | `border-dashed border-white/[0.14]` (as `EmptyState` does)                                    |
| `#f3f5f8` / `.5` / `.4` / `.35` text              | `text-foreground` / `variant="secondary"` / `variant="tertiary"`                              |
| `var(--acc) #00e5ff`                              | `text-acc` / `bg-acc` / `border-acc`                                                          |
| `0 0 0 3px color-mix(… acc 30% …)` selection ring | `ring-[3px] ring-acc/30` — **not** an arbitrary `shadow-[…]` with a literal                   |
| `color-mix(… acc 12% …)` tinted bar               | `bg-acc/[0.12]`                                                                               |
| `#ff6b6b`                                         | `text-danger`                                                                                 |
| radius 6 / 9–11 / 13–14 / 16–20                   | `rounded-chip` / `rounded-control` / `rounded-tile` / `rounded-card`                          |
| `softBlink` keyframe                              | the existing `.animate-livedot` — do **not** add a second blink keyframe                      |
| `cardFloat` keyframe (rank only)                  | new keyframe in `app/globals.css`, frozen under `prefers-reduced-motion` alongside the others |

`{tone}` in the mocks cycles a hardcoded `TONES` array. Ours: derive
deterministically from `COVER_TONES` (`src/shared/types/pack.ts`) by candidate
index, seeded off `pack.coverTone`'s index so a pack's tiles stay in its own
palette family. Tone is a runtime hex, so the gradient is an inline `style` —
that is the documented exception, and the _terminator_ still uses
`var(--background)`.

RTL: 3 of the 8 locales are RTL — logical properties throughout
(`ms-`/`me-`, `ps-`/`pe-`, `start`/`end`). The nxn/1v1 "left/right" side
wording in code is a slot INDEX, not a direction; do not add directional CSS
that flips which slot is which.

---

## Task list

Each task = one commit. Tests first (TDD) in every task that names a test file.

### T1 — `ProgressBar`: full-bleed rail size (shared primitive)

**Files:** `src/shared/components/ProgressBar.tsx`, `ProgressBar.test.tsx`

The play rail is `height:3px`, square-ended, full width. `ProgressBar` is
`h-1 rounded-pill`. **Do not pass `h-[3px] rounded-none` via `className`** —
`cn()` is a plain join, not tailwind-merge, so `h-1 h-[3px]` is resolved by
stylesheet order and you get a silently wrong height (the same trap `Text.tsx`
documents at length).

Add an opt-in `size?: "bar" | "rail"` (default `"bar"`, so no existing call site
changes — `TopPickedTable` and `PodiumTable` both use the default). `"rail"`
→ `h-[3px]`, square ends on both track and fill. Keep `role="progressbar"` and
the `aria-valuenow`/`ariaLabel` surface exactly as-is.

Test: default keeps `h-1`; `size="rail"` renders `h-[3px]`; both keep the
progressbar role and clamp out-of-range values.

New i18n: none.

### T2 — `PlayChrome`: the sticky play bar (shared, all five formats)

**Files (new):** `src/features/play/PlayChrome.tsx`, `PlayChrome.test.tsx`
**Files (deleted):** `PlayHeader.tsx`, `PlayHeader.test.tsx`, `PlayProgress.tsx`
**Files (edited):** `app/packs/[id]/play/page.tsx`, `PlayScreen.tsx`,
`RankPlayScreen.tsx`, `HeadToHeadPlayScreen.tsx`

One component absorbing today's `PlayHeader` (rendered by the _page_) and
`PlayProgress` (rendered inside each screen). The round counter is client state,
so the bar moves **into the three screens** and `page.tsx` stops rendering a
header — each screen already has `pack`, so nothing new is threaded.

Structure, mirroring `PackDetailScreen`'s sticky bar so the two pack surfaces
match: `sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md`,
inner row inside `PACK_CONTAINER`, `flex items-center gap-3 py-3 max-[720px]:px-4`.

- **Start:** the pack title as the page `h1` — `variant="title"`, `text-xl`,
  `min-w-0 truncate`. Keep the h1: `PlayHeader`'s doc comment records _why_
  (round headings are "Round 1"/a pool name/"Which do you prefer?", so a player
  arriving from a shared link had no on-page answer to "what am I playing?").
  The two-layout stacked/grid dance and its `sm:truncate` test go away with the
  old component — a single truncating row in a sticky bar is the mock's shape.
- **End (`ms-auto`):** round counter — `play.roundOf` when playing,
  `play.complete` when finished — `text-[13.5px] tabular-nums
text-foreground-secondary`; then an `Exit` link to `/packs/{id}` styled with
  `buttonClassName("ghost", …, "sm")`, new key `play.exit`.
  ⚠ **Keep the `play.roundOf` string exactly** — `e2e/play.spec.ts` asserts
  `getByText("Round 1 of 2")` and `"Round 2 of 2"` four times.
- **Beneath the row, full-bleed:** `<ProgressBar size="rail" …>` (T1) with
  `ariaLabel` = the same round-counter string, so the rail is announced once
  and meaningfully.

Props: `{ packId: string; title: string; isFinished: boolean; roundIndex: number; totalRounds: number; progressPct: number }`.
The three screens each compute `progressPct` already — pass it, do not
recompute. (`PlayScreen` reads it off `session`; the other two have the same
two-line expression inline. Leave those expressions where they are.)

Test: renders the title as an `h1`, the round counter, an Exit link pointing at
the pack, and a progressbar whose `aria-valuenow` tracks `progressPct`; shows
`play.complete` when `isFinished`.

New i18n: `play.exit` = "Exit".

### T3 — `PlayRoundHeader`: the eyebrow + title + instruction block (shared)

**Files (new):** `src/features/play/PlayRoundHeader.tsx`, `PlayRoundHeader.test.tsx`
**Files (edited):** `PlayScreen.tsx`, `RankPlayScreen.tsx`, `HeadToHeadPlayScreen.tsx`

The block all four mocks open with. Props:
`{ eyebrow: string; title: string; instruction?: string; align?: "start" | "center" }`
(default `"center"`; only the elimination screen passes `"start"`).

- **Eyebrow row** — `flex items-center gap-[9px]`, a `6px` `rounded-pill bg-acc`
  dot with `animate-livedot` (`aria-hidden`), label `text-[12.5px] font-medium
uppercase tracking-[0.16em]`, `variant="tertiary"`.
- **Title** — `Text as="h2" variant="title"`, `text-[clamp(26px,3.6vw,40px)]`,
  `leading-[1.06] tracking-[-0.02em]`. **`h2`, not the mock's `h1`** — the pack
  title in `PlayChrome` is the page's `h1`. `e2e/play.spec.ts` queries
  `getByRole("heading", { name: "2016" })`, which matches either, so this is
  safe as long as it stays a heading.
- **Instruction** — `text-[14.5px]`, `variant="secondary"`, `mt-2`.

**Eyebrow copy: reuse `formats.{format}`, do not add new keys.** The mocks
hardcode "GROUP" / "NxN" / "1V1" / "RANK BLIND · {roundName}"; `formats.*`
already carries a translated name for all five in all 8 locales, and CSS
`uppercase` is a correct no-op in zh/ar/ur. Rank passes
`` `${tFormat("rank_blind")} · ${groupName}` ``, matching its mock exactly.
"GROUP" for `save_one` would be retired vocabulary anyway (pools, not groups).

Test: renders the label, an `h2` with the title, the instruction when passed,
and centres by default.

New i18n: none.

### T4 — `CandidateCard` + the elimination round body (`save_one` / `sacrifice_one`)

**Files:** `src/features/play/CandidateCard.tsx`, `CandidateCard.test.tsx`,
`PlayScreen.tsx`, `PlayScreen.test.tsx`

Mock: `Vilante Play.dc.html` lines 77–128.

- **Card frame** — `rounded-card overflow-hidden bg-background border-[1.5px]`.
  Unselected `border-border`; selected `border-acc ring-[3px] ring-acc/30`.
  Keep `.play-card-appear` and its per-index `animationDelay` (D1 — the stagger
  IS our reveal).
- **Media header, `h-[150px]`** — youtube → `YouTubeCard` (unchanged);
  image → `ImageCard` (unchanged); **text → the mock's new gradient tile**:
  inline `background: linear-gradient(158deg, {tone}, var(--background) 78%)`,
  an `aria-hidden` absolutely-positioned diagonal hairline overlay, and the
  2-digit index at `top-2 start-2`, `text-[11px] font-semibold`,
  `variant="tertiary"`. This replaces today's bare text card, which had no
  media band at all — it is the biggest single visual change on the play screen.
- **Select bar** — `flex items-center gap-[11px] p-[13px_14px] border-t
border-border`, `bg-white/[0.02]` → `bg-acc/[0.12]` when selected. Checkbox:
  `h-[19px] w-[19px] rounded-chip border-[1.5px]`, `border-border-strong` →
  `border-acc bg-acc` with a CSS-border check glyph (`aria-hidden`) when
  selected. Title `text-[14.5px] font-semibold`; index `text-[11px]`,
  `variant="tertiary"`, at the end.
- ⚠ **Keep the accessible names and the youtube split-control structure.** The
  youtube branch deliberately puts the select control _below_ the player so
  interacting with the video doesn't select the item. `aria-label={t("pick", …)}`
  is asserted by `e2e/play.spec.ts` (`"Pick Poster A"`) and the image branch
  must keep its `<img>` accessible name (`getByRole("img", { name: "Poster A" })`).
  The plain-text branch has no `aria-label` today and gains one for parity —
  fine, but check no e2e locator becomes ambiguous.
- **Grid** — keep `candidateGridCols()` and `data-testid="candidate-grid"`
  exactly. `PlayScreen.test.tsx:324` asserts the resolved grid class. The mock's
  fixed-230px `flex-wrap` is a downgrade for an 8-candidate round; the comment
  above `CANDIDATE_GRID_COLS` explains the current choice. Adapt, don't replace.
- **Confirm row** — restyle to the mock's button (`h-[52px] px-[30px]
rounded-tile text-[15.5px] font-semibold`) but keep it **always rendered and
  natively `disabled`** (D1): `e2e/play.spec.ts` asserts
  `getByRole("button", { name: "Next round →" })).toBeDisabled()` before a
  selection exists. Keep `play.nextRound` / `play.finishRound` verbatim
  (`"Next round →"` / `"See results →"` are matched exactly, six times).
- `PlayScreen` now composes `PlayChrome` (T2) + `PlayRoundHeader` (T3,
  `align="start"`, `instruction = t(INSTRUCTION_KEY[pack.format])`) and drops
  its own header `<section>`.

New i18n: none.

### T5 — `VersusRound`: the `nxn` two-side round body

**Files:** `src/features/play/VersusRound.tsx`, `VersusRound.test.tsx`,
`PlayScreen.tsx` (the versus branch only)

Mock: `Vilante Play NxN.dc.html` lines 77–132.

- **Layout** — `grid grid-cols-[1fr_auto_1fr] gap-[22px] items-start`, stacking
  to one column below `sm` (the mock has no mobile case; follow
  `NxNResultScreen`'s established stacking).
- **Side panel** — `rounded-card border-2 p-4 flex flex-col gap-3`. Unselected
  `border-border bg-white/[0.015]`; selected `border-acc bg-acc/[0.08]
ring-[3px] ring-acc/[0.22]`.
- **Side header** — centred row: a `h-5 w-5 rounded-chip bg-acc text-[11px]
font-semibold text-[#07131a]` letter badge (A / B — derive from the slot
  index, **not** from the pool name), the side name at `text-[14.5px]
font-semibold`, and when selected an `18px` accent check circle
  (`aria-hidden`; selection is already announced by `aria-pressed`).
- **Item tiles** — `rounded-tile overflow-hidden bg-background border border-border`,
  media band `h-[110px]` (same three treatments as T4), label
  `p-[11px_13px] text-[13.5px] font-semibold`.
- **VS** — `h-11 w-11 rounded-pill border border-border bg-white/[0.04]`,
  `text-xs font-semibold`, `variant="secondary"`, vertically centred against
  the panels' tops (`pt-14` today; mock uses `padding-top:60px`).
  ⚠ **Exactly one element on the play screen may read "VS"** —
  `e2e/play.spec.ts` does `getByText("VS", { exact: true })`, which is strict.
- ⚠ **Keep the side's `role="button"` + `aria-label={t("pick", { name })}`**
  (`"Pick Boys"` / `"Pick Girls"` are asserted four times) **and the
  `event.target !== event.currentTarget` keydown guard** — that guard is why
  keyboard-activating a nested youtube control doesn't also select the side.
  Promoting the div to a real `<button>` would nest a button inside a button;
  leave the role as-is.

New i18n: none.

### T6 — `HeadToHeadRound`: the `1v1` round body

**Files:** `src/features/play/HeadToHeadRound.tsx`, `HeadToHeadRound.test.tsx`,
`HeadToHeadPlayScreen.tsx`

Mock: `Vilante Play 1v1.dc.html` lines 61–98.

- **Layout** — `grid grid-cols-[1fr_auto_1fr] gap-[22px] items-center`, one
  column below `sm`.
- **Contender card** — `rounded-card overflow-hidden bg-background border-2`;
  unselected `border-border`, selected `border-acc ring-[3px] ring-acc/30`
  (`SELECTED_FRAME` / `UNSELECTED_FRAME` stay the single source — update them,
  don't fork). Media band `h-[230px]` (three treatments as T4); label
  `p-[18px] text-[18px] font-semibold text-center`.
- **VS** — `h-12 w-12 rounded-pill`, otherwise identical to T5's.
- Keep `aria-pressed`, `aria-label={t("pick", …)}`, the confirm button (D3),
  and the youtube/image split-control shape.
- `HeadToHeadPlayScreen` composes `PlayChrome` + `PlayRoundHeader`
  (`eyebrow = tFormat("1v1")`, `title = t("whichPrefer")`, centred) and drops
  its own header `<section>` and inline progress block.

New i18n: none.

### T7 — `RankPlayScreen`: the floating card + slot grid

**Files:** `src/features/play/RankPlayScreen.tsx`, `RankPlayScreen.test.tsx`,
`app/globals.css` (one new keyframe)

Mock: `Vilante Play Rank.dc.html` lines 51–117. **Styling only — `place()`,
`goToNextRound()`, both effects and the `RecordedPick` build are D-protected.**

- **Current item card** — `w-[230px] rounded-card overflow-hidden bg-background
border-[1.5px] border-acc ring-4 ring-acc/[0.16]`, centred, with the mock's
  `cardFloat` idle animation. Add `@keyframes card-float` +
  `.animate-card-float` to `app/globals.css` (`3.2s ease-in-out infinite`,
  `translateY(0 → -5px → 0)`) **and freeze it in the existing
  `prefers-reduced-motion: reduce` block** alongside `.play-card-appear` /
  `.animate-livedot`. Media band `h-[150px]` (three treatments as T4), label
  `p-[14px] text-[16.5px] font-semibold`.
- **Instruction** — keep `t("rankInstruction", { current, total })` under the
  card, matching the mock's "Choose where this one goes — element N of M".
- **Slot grid** — `grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]`,
  replacing today's `grid-cols-2 sm:grid-cols-3`. Each slot
  `min-h-[110px] rounded-tile p-[14px] flex flex-col justify-between`:
  - empty → `border-[1.5px] border-dashed border-white/[0.14] bg-white/[0.02]`,
    hover `border-acc/40` (keep), label `#N` at `text-[11px] font-semibold
tabular-nums` `variant="tertiary"`, body `t("placeHere")` at `text-[12.5px]`.
  - filled → `border-[1.5px] border-border` with the tone gradient as the
    background (`linear-gradient(158deg, {tone}, var(--background) 82%)`,
    inline), `#N` at `text-white/75`, title `text-sm font-semibold line-clamp-2`.
  - ⚠ Keep `disabled={Boolean(filled)}` and both aria-labels
    (`play.rankSlotFilled` / `play.rankSlotEmpty`) — `RankPlayScreen.test.tsx`
    drives the whole flow through them.
- **Round-complete interstitial** (D2's exception) — restyle to the mock:
  eyebrow `ROUND COMPLETE` via `PlayRoundHeader` (new key, see below), title
  `t("ranked", { name })`, then the existing `RankedList` (**do not fork it** —
  it is deliberately the same component the result screen uses), then the
  confirm-styled `Next round →` button. Mock's "Next up: {nextRoundName}" line
  is a nice addition; it needs `roundHeading(pack, roundIndex + 1)`, which is
  free.
- `PlayChrome` + `PlayRoundHeader` replace the inline progress block and header
  `<section>`.

New i18n: `play.roundComplete` = "Round complete" (eyebrow), `play.nextUp` =
"Next up: {name}".

### T8 — `PicksSummary`: the "SAVED SO FAR" chip row

**Files:** `src/features/play/PicksSummary.tsx`, `PicksSummary.test.tsx` (new —
there is no test today)

Mock: `Vilante Play.dc.html` lines 146–158, `NxN` lines 159–171.

Label row `text-[12px] font-medium uppercase tracking-[0.12em]`,
`variant="tertiary"`, `mb-3`. Chips: `inline-flex items-center gap-2
p-[7px_12px] rounded-control bg-white/[0.03] border border-border
text-[12.5px]`, `variant="secondary"`, each with `animate-[…] popIn`-equivalent
— reuse `.play-card-appear` rather than adding a third entry animation.

The mocks prefix each chip with a per-format marker (a year, an A/B side
badge). Ours has `Pick.itemTitle` and, for versus, the side name in the same
field — **do not invent a marker the data doesn't carry**. Render the title
alone; for nxn, the title _is_ the side name, which is the mock's marker in
substance.

Keep `Badge`'s role out of it: today's `<Badge>` is a bold uppercase pill, which
is wrong for a sentence-case item title. Chip styling goes inline here rather
than adding a `Badge` variant.

Test: renders the label and one chip per pick, keyed stably.

New i18n: none.

### T9 — (OPTIONAL) Report this round

**Files (new):** `src/features/play/ReportRoundButton.tsx`,
`ReportRoundModal.tsx`, `ReportRoundModal.test.tsx`

Genuinely new behaviour (D7), its own commit, first to cut. Uses the shared
`Modal`, `reportsClient.create({ type: "round", targetId: pack.id, roundIndex,
reason, comment })`, and the four reason ids from
`REPORT_REASON_LABELS.round` — **ids from that map, labels from new message
keys**, because the existing labels are hardcoded English moderator-facing
strings and this modal is player-facing in 8 locales.

Trigger pill: `flex items-center gap-[7px] text-[13px] font-medium
p-[8px_12px] rounded-control bg-white/[0.03] border border-border`,
`variant="secondary"`, placed per mock (end of the header row on the
elimination screen; centred beneath the header on nxn/1v1/rank).
Modal body: radio list (`role="radiogroup"`, one row per reason,
`rounded-control`, accent tint + accent dot when selected), an optional
`Textarea rows={3}`, then `Cancel` (`common.cancel`) + `Submit report`
(disabled until a reason is chosen). On success, swap the body for the
thanks state for ~1.4s then close.

Anon-gate: signed-out users must see the **blocked + tooltip** treatment, never
a surprise `/auth` redirect — the mock redirects, we do not.

New i18n: `play.reportRound`, `play.reportRoundTitle`, `play.reportSubmit`,
`play.reportDetailsPlaceholder`, `play.reportThanks`, `play.reportThanksBody`,
`play.reportReason.wrongAnswer`, `.brokenMedia`, `.inappropriate`, `.other`
(10 keys × 8 locales).

### T10 — Derivation: `result-summary.ts`

**Files (new):** `src/features/result/result-summary.ts`, `result-summary.test.ts`

Pure module — no React — resolving D5. From `{ format, ownPicks, results }`
produce the hero tiles:

```
summarizeResult({ format, ownPicks, results }) -> {
  tiles: ResultTile[]   // 0–3 entries; EMPTY when the numbers don't exist
}
type ResultTile =
  | { kind: "percent"; labelKey: string; value: number }
  | { kind: "pick";    labelKey: string; title: string; percent: number }
  | { kind: "count";   labelKey: string; value: number }
```

- `save_one` / `sacrifice_one` / `1v1`: join `ownPicks` (where `chosen !== false`)
  against `results.topItems` by `itemId`, then
  `agreement = round(mean(tally.percentage))`, `topPick` = the joined pick with
  the highest `percentage`, `rarestPick` = the lowest. Every percentage is
  `picked / appeared` — **never** `count / totalPlays` (D5).
- `nxn`: three `count` tiles — plays recorded, rounds you played, items you saw.
  No percentages, ever (#333).
- `rank_blind`: three `count` tiles — rounds ranked, items placed, podium
  entries.
- Empty `topItems`, empty `ownPicks`, or a join that matches nothing → `tiles: []`,
  and the hero row does not render. Zeros are a lie here, not a fallback.

Tests: one per format; the join-misses-everything case; a single-pick play
(top and rarest are the same item — pick one tile or the other, don't show both
naming the same thing); a `shared` play (the numbers are the sharer's, and the
labels must say so — see T11).

### T11 — Result page shell: sticky bar + hero + footer CTA

**Files:** `app/packs/[id]/result/page.tsx`, `src/features/result/ResultScreen.tsx`,
**new** `ResultHero.tsx` + `ResultHero.test.tsx`, **new** `ResultAgainPanel.tsx`,
`ResultActions.tsx`, and the four result screens' top blocks

Mock: `Vilante Result.dc.html` lines 32–74 and 100–110.

- **Sticky action bar** — same treatment as `PackDetailScreen`'s
  (`sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md`,
  inner row in `PACK_CONTAINER`). Start: the existing `BackButton` (moved out of
  `page.tsx`'s loose `<div>`). End (`ms-auto`): `ResultActions` — the same
  component, no longer passed `className="mb-6 justify-end"` by four screens.
  This removes the duplicated action row from all four.
  ⚠ Exactly one "Play again" / "Try it yourself" control in the tree at a time
  — the footer panel (below) must not add a second one with the same accessible
  name.
- **Hero** (`ResultHero`) — eyebrow (`result.label`, live dot, same recipe as
  `PlayRoundHeader`'s), then `h1` = `result.heroTitle` ("Your run is complete")
  or `result.heroTitleShared` when `shared`, `text-[clamp(30px,4vw,44px)]
font-semibold leading-[1.06] tracking-[-0.02em]`; then a subtitle line
  carrying **the pack title** + `result.playsRecorded`, `text-[15.5px]`,
  `variant="secondary"`, `max-w-[520px]`.
  ⚠ **This moves the pack title out of the `h1`.** Every result `*.test.tsx`
  that queries the heading by the pack title needs updating (T13). The title
  stays on screen in the subtitle, so no locator loses its text — only its role.
  `ResultLocked` keeps the pack title as its `h1` (it is not a completed run).
- **Stat tiles** — the `summarizeResult` tiles (T10) as
  `flex flex-wrap gap-[14px]`, each `flex-1 basis-[200px] p-5 rounded-card
bg-surface-card border border-border`. `percent` tiles put the number at
  `text-[32px] font-semibold tabular-nums text-acc` over a `text-[12.5px]`
  `variant="tertiary"` label; `pick` tiles put `{title}` at `text-[15px]
font-semibold` over the label. Row hidden entirely when `tiles` is empty.
- **`ResultAgainPanel`** (new, mock lines 100–110) — a full-width panel at the
  bottom: `flex items-center justify-between gap-[18px] flex-wrap p-[26px_24px]
rounded-card bg-surface-card border border-border`. Copy `result.againHeading`
  - `result.againBody`, then two links: `result.exploreMore` → `/` (secondary)
    and the play link (primary). ⚠ The mock's body copy — "Groups reshuffle their
    random pools each time you play" — is **retired vocabulary**; ship
    "Rounds redraw from their pools each time you play." Give the panel's play
    link a distinct accessible name from the sticky bar's, or make the sticky
    bar's the only one — decide once and assert it.
- `SharedResultNote` keeps its slot between the hero and the recap.

New i18n: `result.heroTitle`, `result.heroTitleShared`, `result.againHeading`,
`result.againBody`, `result.exploreMore`, plus the tile labels
`result.statAgreement`, `result.statTopPick`, `result.statRarePick`,
`result.statPlays`, `result.statRoundsPlayed`, `result.statItemsSeen`,
`result.statRoundsRanked`, `result.statItemsPlaced`, `result.statPodiumEntries`
(only the ones D5 actually lands on).

### T12 — Result recap rows + the locked / error / shared states

**Files:** `EliminationResultScreen.tsx`, `NxNResultScreen.tsx`,
`HeadToHeadResultScreen.tsx`, `RankResultScreen.tsx`, `ResultLocked.tsx`,
`SharedResultNote.tsx`, `src/shared/components/RankedList.tsx`, and their tests

Restyle only — every `playedRounds`/`playedMatchups` rebuild is D-protected.

- **Section heading** — the four screens each open their ranking section with
  an `h2` + subtitle. Adopt the mock's `13px/500 tracking-[.14em] uppercase`
  `variant="tertiary"` eyebrow heading (the same shape `PackDetailScreen`'s
  local `SectionHeading` uses — consider lifting that into
  `src/shared/components/` rather than a third copy; if you do, that is its own
  commit and its own test).
- **Recap rows** — keep every screen's structure and its `data-testid`s
  (`picked` / `dropped` / `winner` / `loser`, plus `data-outcome` and
  `data-side`), which the tests drive. Restyle the row itself to the mock's:
  `flex items-center gap-4 p-[13px_16px] rounded-tile bg-surface-card border
border-border`, meta right-aligned and `tabular-nums`. Keep the
  green/red picked/dropped pairing — it is a _paired_ border+background for the
  `cn()` reason documented in `EliminationResultScreen`; do not split it.
- **Drop the stale `hover:translate-y-0 hover:shadow-none` overrides** on every
  `<Card>` in `ResultScreen`, `EliminationResultScreen`, `NxNResultScreen`,
  `HeadToHeadResultScreen`, `ResultLocked`. `Card` is non-interactive by default
  now (`interactive` prop, added in the Pack Detail slice) — these are dead
  counter-classes.
- **`RankedList`** — shared with the play screen's between-rounds recap, so any
  change lands in both. Restyle rows to match the recap rhythm above; keep the
  numbered `h-7 w-7` badge and the `shownAt` meta.
- **`ResultLocked`** — the "finish the pack first" card gets the same panel
  treatment as `ResultAgainPanel`; keep the pack title as its `h1` and the
  three strings.
- **`SharedResultNote`** — restyle to a bordered notice consistent with the
  panels; copy unchanged.

New i18n: none.

### T13 — i18n catalogs (8 locales) + tests + gates + PR

**Files:** `messages/{ar,bn,en,hi,ru,uk,ur,zh}.json`, `e2e/play.spec.ts`,
every touched `*.test.tsx`

**i18n.** Add every key above to all 8 catalogs — real translations, not
transliterated placeholders. Traps, all burned before:

- **ar/ur connotation.** Do **not** re-translate the format names when wiring
  the eyebrow (T3) — `formats.sacrifice_one` already has a vetted rendering in
  both (`ضحِّ بواحد` / `ایک نکالو`; the obvious literal قربانی reads as
  _religious sacrifice_, Qurbani/Eid al-Adha, which is why it was fixed once).
  Read the value, never re-derive it. The same care applies to any new
  "sacrificed" phrasing in the result hero labels.
- **ICU plurals.** `result.playsRecorded` and `play.finishedSave`/`Sacrifice`
  already exist with full form sets. Any new count-bearing string (the `count`
  tiles in T10/T11, `play.nextUp` if it ever takes a number) needs ar's
  `zero/one/two/few/many/other` and ru/uk's `one/few/many/other` — **mirror the
  forms from an existing count-noun in the same catalog**, don't invent them
  (this is exactly what `auth.brand.socialProof` had to be fixed for in
  `386d06c`). Prefer phrasings that avoid a plural entirely where the design
  allows.
- Run the catalogs-parity check — the `LOCALES` ↔ `messages/*.json` invariant is
  asserted in `src/shared/types/cross-repo-drift.test.ts`.
- Delete nothing: `play.finishedTitle` / `finishedSave` / `finishedSacrifice` /
  `finishedVersus` are the D2 interstitial's strings and are currently unused by
  any screen. Leave them — removing keys across 8 catalogs is a separate,
  auditable change, and D2 could be revisited.

**Vitest.** New: `PlayChrome.test.tsx`, `PlayRoundHeader.test.tsx`,
`PicksSummary.test.tsx`, `result-summary.test.ts`, `ResultHero.test.tsx`,
`ProgressBar.test.tsx` (extended). Deleted: `PlayHeader.test.tsx`. Updated:
`PlayScreen.test.tsx` (header/progress moved; keep the `candidate-grid` class
assertion), `RankPlayScreen.test.tsx`, `HeadToHeadPlayScreen.test.tsx`,
`HeadToHeadRound.test.tsx`, `VersusRound.test.tsx`, `CandidateCard.test.tsx`,
and **all four** result screen tests (the `h1` moves off the pack title — T11).
`use-play-session.test.ts`, `use-play-resume.test.ts`, `round-sampling.test.ts`,
`seeded-rng.test.ts`, `pack-structure-hash.test.ts`,
`play-resume-storage.test.ts` and `use-round-selections.test.ts` must **not**
need edits; if one does, something in scope-boundary was touched.

**Playwright.** `e2e/play.spec.ts` is the only play/result e2e today. This slice
changes UI _and_ moves copy between elements, so per the repo's e2e rule it is
not optional. Verify each of these still resolves after the restyle rather than
assuming:

1. `getByText("Round 1 of 2")` / `"Round 2 of 2"` — moved into `PlayChrome`;
   the string must not change (T2).
2. `getByRole("button", { name: "Show all" })).toHaveCount(0)` ×2 — the D1
   guard. It must still be zero.
3. `getByRole("button", { name: "Next round →" })).toBeDisabled()` — the confirm
   must stay natively `disabled`, not `aria-disabled` (T4).
4. `"See results →"`, `"Pick Boys"`, `"Pick Girls"`, `"Pick Poster A"`,
   `getByRole("img", { name: "Poster A" })` — accessible names deliberately
   unchanged.
5. `getByText("VS", { exact: true })` — strict mode; exactly one VS per play
   screen (T5/T6).
6. `getByRole("heading", { name: "2016" })` / `"2020"` / `"Posters"` — the round
   title stays a heading (now `h2` under `PlayChrome`'s `h1`).

Worth adding (optional, cheap): a `e2e/result.spec.ts` finishing `pack-save` and
asserting the hero + recap. `e2e/mock-backend.ts` already serves
`GET /packs/:id/results`, so no fixture work is needed.

**Gates** (no CI runs on `release/*` — everything is local):
`npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run test:e2e` ·
production `next build` · catalogs parity. Then
`pr-review-toolkit:code-reviewer`, plus `ui-guardian` for the design-token/a11y
pass (this slice adds a keyframe, a shared-primitive variant and a lot of new
markup). PR into `release/2.0.0` — self-merge is fine per the release-branch
rule; **never** open this against `develop`/`main` without asking.

---

## Deferred / adapted (state these explicitly in the PR body)

- The mocks' `Showing X of Y` + `Show next` / `Show all` reveal controls and the
  reveal-gated confirm — **retired mechanic, not implemented** (D1, `4ff2462`).
- The mocks' terminal COMPLETE section and "See your result" CTA — we redirect
  as soon as the play record settles (D2). `rank_blind`'s between-rounds
  interstitial is kept and restyled.
- 1v1's click-to-advance — kept as select-then-confirm (D3).
- The mocks' own `<header>` nav — replaced by `AppShell` + a sticky `PlayChrome`
  sub-bar, following the Pack Detail precedent (D4).
- The result mock's `count / totalPlays` percentages, its All/Rare filter and
  its POPULAR/RARE chips — replaced by `picked / appeared` tiles where that
  statistic honestly exists, and by counts where it doesn't (D5, D6; #336, #333).
- The mock's flat one-row-per-pick list — our per-round slate recap is kept and
  restyled (D6).
- The mock's `softBlink` keyframe → the existing `.animate-livedot`.
- The mock's placeholder `<video>` hover-preview and striped image tiles → the
  real `YouTubeCard` / `ImageCard`.
- The mock's eyebrow strings ("GROUP", "1V1", "RANK BLIND") → `formats.*`,
  uppercased in CSS — no new translations, and "GROUP" would be retired
  vocabulary.
- The mock's "Groups reshuffle their random pools" footer copy → "Rounds redraw
  from their pools" (same retired-vocabulary reason).
- 1v1's narrower `max-width:900px` main column → the shared `PACK_CONTAINER`.
- Report this round (T9) if cut.
