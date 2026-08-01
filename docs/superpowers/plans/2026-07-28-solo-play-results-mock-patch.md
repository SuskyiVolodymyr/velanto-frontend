# Solo Play + Results — Real-Mock Patch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Patch the just-shipped Solo Play + Results redesign (merge `f3e94ed`, plus follow-up `615f2ec`/`f7bd115`/`6faabca`/`457d80e`) against the REAL, current Claude Design mocks (`Solo Play.dc.html` + `Results.dc.html`, DesignSync project `67c2561f-a9ab-433b-a48b-d1a3e2aa88d8`) — the original build was accidentally built from a stale local mock folder (now deleted). Owner ruling: "Claude Design is source of truth now — about UI, but not business logic."

**Architecture:** Pure UI/layout/copy patch on top of the existing `src/features/play/*` and `src/features/result/*` components and data model (`result-summary.ts`'s picked/appeared derivation is CORRECT per the mock's own code comment — do not touch that math, only its presentation).

**Explicitly OUT OF SCOPE (flagged, not built):**

- Results' entire `source="room"` variant (voter avatars, tiebreak stat, "who was in" roster card, "ROOM SAVED"/no-winner framing) — depends on the still-dormant multiplayer voting-room mode.
- The "Play with friends" CTA in the results share panel — same reason.
- Per-item `duration` badge on pick cards — no duration metadata exists for any item type today; low priority, skip.

**Tech Stack:** Next.js 16, Tailwind, next-intl (8 locales).

---

### Task 1: PlayChrome header rebuild

**Files:**

- Modify: `src/features/play/PlayChrome.tsx`

- [ ] **Step 1: Replace text-based header with icon back-button + cover thumbnail + SOLO chip**
      Current header (`PlayChrome.tsx` ~lines 61–90) renders `title` + `roundLabel` text + a text `"Exit"` link, with a full-width `ProgressBar` rail underneath. Mock's bar: an icon-only 38×38 back-arrow button (reuse the same chevron pattern as `BackButton`/other 2.0.0 headers), a 36×36 pack-cover gradient thumbnail (build from `pack.coverTone` the same way other screens derive a tone gradient — check `toneFor`/`candidate-tone.ts` or the pack-card cover gradient helper), a `"SOLO"` mode chip (small pill, matches the mock's plain grey chip — NOT a mode variable yet since only solo exists), and a `packMeta` line (e.g. "Save one · 8 rounds" — derive from `pack.format` + round count, reuse whatever the pack-meta string helper already produces elsewhere).

- [ ] **Step 2: Move the progress rail out of the header**
      The mock does NOT show the round-progress rail in the sticky header at all — progress moves into the round section itself as small segmented dashes (handled by Task 2, `PlayRoundHeader`). Remove `ProgressBar`'s `size="rail"` usage from `PlayChrome.tsx` if it lives there; confirm it's not needed elsewhere in the chrome after this change.

- [ ] **Step 3: Update/add `PlayChrome.test.tsx`, run it**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(play): rebuild PlayChrome header per real mock (T1)" -- src/features/play/PlayChrome.tsx src/features/play/PlayChrome.test.tsx`

---

### Task 2: PlayRoundHeader — round-number badge + progress dashes

**Files:**

- Modify: `src/features/play/PlayRoundHeader.tsx`

- [ ] **Step 1: Add the round-number badge tile**
      Mock shows a 56×56 cyan-tinted rounded tile with the current round number (mono, large) to the left of the round title block. Add this; the eyebrow text changes from the current format-name (`tFormat(pack.format)`) to a round-position string `"ROUND {n} OF {total}"` (data — `roundIndex`/`totalRounds` — is already threaded into this component).

- [ ] **Step 2: Add the segmented progress-dash row**
      Small rounded dash-segments (one per round, `steps` in the mock), each filled/half-filled/empty by position relative to current round — this is what replaced the header's full-width rail (Task 1, Step 2). Plus a small right-aligned progress note (e.g. "4 rounds done").

- [ ] **Step 3: Update/add tests, run them**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(play): add round-number badge + segmented progress to PlayRoundHeader (T2)" -- src/features/play/PlayRoundHeader.tsx src/features/play/PlayRoundHeader.test.tsx`

---

### Task 3: CandidateCard — selection indicator + chosen badge

**Files:**

- Modify: `src/features/play/CandidateCard.tsx`

- [ ] **Step 1: Move the selection indicator to the right side**
      `SelectBar` currently places the checkbox/indicator LEFT of the title; mock's `i.mark` circle sits on the RIGHT, after the title text (`justify-content` swap or explicit `margin-left:auto` on the mark, matching the mock's `margin-left:auto` on the mark span).

- [ ] **Step 2: Add a "chosen" badge overlay**
      When selected, the mock overlays a top-left pill badge with format-specific text (`"SAVED"` / `"SACRIFICED"`) on the card's cover image — shipped currently only changes border color/ring with no badge text. Add the badge, reusing whichever i18n keys already carry "Saved"/"Sacrificed" wording elsewhere (check `PicksSummary`/result screens for existing strings before adding new ones).

- [ ] **Step 3: Update/add `CandidateCard.test.tsx`, run it**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(play): move selection mark right + add chosen badge on CandidateCard (T3)" -- src/features/play/CandidateCard.tsx src/features/play/CandidateCard.test.tsx`

---

### Task 4: Footer confirm bar — card wrapper + copy + arrow icon

**Files:**

- Modify: `src/features/play/PlayScreen.tsx` (and wherever the equivalent footer lives in `RankPlayScreen.tsx`/`HeadToHeadPlayScreen.tsx` if not already shared via `PlayChrome`/a common footer component — check first, this may already be centralized)

- [ ] **Step 1: Wrap the confirm bar in a card**
      Currently `<div className="mb-10 flex justify-end"><Button size="lg">…</Button></div>` — no card container. Mock: a `#171A22` rounded-16 bordered card, `flex-wrap` row, with a left-side text block (`footTitle`/`footNote`) and the button on the right.

- [ ] **Step 2: Add status copy + arrow icon**
      Left side: bold title reflecting selection state (e.g. "Locked in — you can still change it" when something's picked, "Nothing picked yet" otherwise) + a dimmer note ("Your pick is recorded when you move to the next round."). Button gains a trailing SVG arrow icon (chevron-right style, matches the mock's `M5 12h13M13 7l5 5-5 5` path) in addition to its existing text label.

- [ ] **Step 3: Confirm this is shared correctly across all three play screens**
      If `PlayScreen.tsx`/`RankPlayScreen.tsx`/`HeadToHeadPlayScreen.tsx` each hand-roll their own footer today, consider extracting one shared `PlayConfirmBar` component here rather than tripling the new markup — matches the DRY principle the codebase otherwise follows (see `Button size="lg"` dedup precedent from the prior cleanup task).

- [ ] **Step 4: Update/add tests, run them**

- [ ] **Step 5: Commit**
      `git commit -m "refactor(play): card-wrap confirm bar with status copy + arrow icon (T4)" -- src/features/play/PlayScreen.tsx src/features/play/RankPlayScreen.tsx src/features/play/HeadToHeadPlayScreen.tsx`
      (adjust paths if a new shared component file is added — include it explicitly)

---

### Task 5: PicksSummary — numbered chips + count note

**Files:**

- Modify: `src/features/play/PicksSummary.tsx`

- [ ] **Step 1: Add a numbered badge to each chip**
      Mock: each pick chip has a small circular numbered badge (`pk.n`) before the item name. Add using the pick's 1-based position in the run.

- [ ] **Step 2: Add the count note next to the heading**
      Mock shows a note like "3 done, 3 to go" beside the `"YOUR RUN SO FAR"` heading. Compute from picks-so-far vs. total rounds (data already available to this component via props).

- [ ] **Step 3: Update/add tests, run them**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(play): numbered chips + count note in PicksSummary (T5)" -- src/features/play/PicksSummary.tsx`

---

### Task 6: VersusRound — grid item layout + footer tick

**Files:**

- Modify: `src/features/play/VersusRound.tsx`

- [ ] **Step 1: Lay out a side's items via CSS grid, not a vertical stack**
      `SideCard`'s items currently render in a `flex flex-col`; mock uses a grid sized by `sd.itemCols` (matters most for nxn sides with several items — up to 8/side). Switch to `grid grid-template-columns: repeat({items.length}, minmax(0,1fr))` (or Tailwind's arbitrary-value grid equivalent).

- [ ] **Step 2: Add the optional footer confirmation row**
      Mock's `showFootTick` renders a small checkmark + "Selected"-style label under a side's items once picked. Currently shipped only shows a checkmark next to the side-name label. Add the footer row for the selected side.

- [ ] **Step 3: Update/add `VersusRound.test.tsx`, run it**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(play): grid item layout + footer tick on VersusRound (T6)" -- src/features/play/VersusRound.tsx src/features/play/VersusRound.test.tsx`

---

### Task 7: RankPlayScreen restructure (two-column: status panel + slot rows)

**Files:**

- Modify: `src/features/play/RankPlayScreen.tsx`

**This is the biggest single layout change in the slice — take it slow, preserve all existing game logic (only the DOM/layout structure changes).**

- [ ] **Step 1: Restructure to the mock's two-column grid**
      Current: single centered column — a floating current-item card above a responsive grid of slot tiles, switching to an entirely different section (`PlayRoundHeader` + `RankedList` + "Next round" button) on round completion.
      Mock: a persistent two-column grid (`minmax(0,1fr) minmax(0,1.1fr)`) for the ENTIRE round, left column = status panel, right column = a vertical list of numbered slot ROWS (not a grid of tiles). On completion, the LEFT panel's content flips in place (from "PLACE THIS ONE" pending-state copy to a green "ROUND RANKED" done-state copy) rather than swapping to a different section/layout.

- [ ] **Step 2: Build the left status panel's two states**
      Pending: eyebrow "PLACE THIS ONE" (cyan), the current item's cover + name, flavor copy ("You can't see what's coming next — that's the whole game. Pick a slot and commit."), and a `remainingNote` footer ("N still hidden after this").
      Done (all slots filled this round): eyebrow "ROUND RANKED" (green), a summary line ("The 3D era, in your order" — adapt to the actual round name), flavor copy ("Nothing to change now — this is what blind ranking gives you. Move on to the next round."), and the same footer style showing "All N placed".
      Both states live in the SAME panel position — implement as a conditional render keyed on whether all slots are filled, not a route/section swap.

- [ ] **Step 3: Build the right column's slot rows**
      Replace the grid-of-tiles with a vertical list of rows: each row = a numbered badge (position) + a label (filled: the placed item's name; empty+pending: "Place {current item name} here"; empty+done: "Empty" — shouldn't occur once done, but mirror the mock's fallback). Dashed border style while empty, solid once filled. Preserve the existing click-to-place interaction and all state logic — only the visual row shape changes from a tile grid to a list.

- [ ] **Step 4: Keep the "Next round" trigger consistent with the shared confirm-bar pattern from Task 4**
      If Task 4 extracted a shared `PlayConfirmBar`, use it here too for the round-complete → next-round transition, rather than RankPlayScreen's own bespoke button, so the two patches compose instead of conflicting. Coordinate with Task 4's implementer if both are in flight concurrently (check `git log` for Task 4's commit before starting this step; rebase-friendly since both are on the same branch).

- [ ] **Step 5: Preserve ALL existing tests' intent, updating only DOM queries**
      This is a pure restructure — no game-logic change. Run `RankPlayScreen.test.tsx` (including the T7 round-complete-interstitial tests added in the prior cleanup pass) and update selectors to match the new DOM shape without changing what behavior is being asserted.

- [ ] **Step 6: Commit**
      `git commit -m "refactor(play): restructure RankPlayScreen to two-column status+slots layout (T7)" -- src/features/play/RankPlayScreen.tsx src/features/play/RankPlayScreen.test.tsx`

---

### Task 8: Results page shell — two-column layout

**Files:**

- Modify: `src/features/result/ResultScreen.tsx`

- [ ] **Step 1: Restructure into the mock's two-column grid**
      Current: single-column stack — Hero → recap → `ResultAgainPanel`, with CTAs in the sticky top bar (`ResultActions`). Mock: `minmax(0,1fr) minmax(0,330px)` grid — recap (left) + a right aside holding 2–3 stacked cards (Task 11's Share/CTA card, Task 12's leaderboard card; the room-only "Who was in" card is explicitly OUT OF SCOPE per this plan's header).
      Hero stays full-width ABOVE the two-column grid (matches the mock — hero is not inside either column).

- [ ] **Step 2: Thread the aside's cards through as children/props**
      Keep `ResultActions`'s functional role (share/play-again capability) but plan for Tasks 11–12 to relocate its actual buttons into the new aside cards — this task only builds the grid shell; leave a placeholder aside slot if Tasks 9–12 aren't done yet (they can land in the same PR, coordinate via `git log`).

- [ ] **Step 3: Update/add `ResultScreen.test.tsx`, run it**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(result): restructure ResultScreen to two-column layout (T8)" -- src/features/result/ResultScreen.tsx src/features/result/ResultScreen.test.tsx`

---

### Task 9: Round-by-round recap rows — winner-highlight + loser-pills split

**Files:**

- Modify: `src/features/result/EliminationResultScreen.tsx`, `src/features/result/NxNResultScreen.tsx`, `src/features/result/HeadToHeadResultScreen.tsx`, `src/features/result/RankResultScreen.tsx`

- [ ] **Step 1: Add the "ROUND BY ROUND" section heading**
      None of the four recap screens currently render this heading (12px cyan letter-spaced) + a note ("what you picked each round").

- [ ] **Step 2: Restructure each round row to the mock's split**
      Mock row = `grid[auto,1fr]`: LEFT = round-number chip + round name, then a verdict block — a colored label (`"YOU SAVED"`/`"YOU SACRIFICED"` in green `#7EE7B4` for solo) + the winner/survivor's name (bold). RIGHT (divided by a left border) = a `"LOST"`/`"SURVIVED"` label (dim) + wrapped PILL chips of the round's other items.
      `EliminationResultScreen.RoundCard` currently renders every item — winner and losers alike — as its own full-width bordered `<li>`, tinted green/red, with a plain `"Your pick"`/`"Pick"` tag. Replace with the winner-highlight + loser-pill-row split. Apply the equivalent restructure to `NxNResultScreen`/`HeadToHeadResultScreen` (their own "list of bordered item rows" pattern) and adapt `RankResultScreen` similarly where the concept maps (ranked lists don't have a single "winner" the same way — use judgment on how the verdict-label + rest-of-list split translates; e.g. verdict could show the item YOU ranked #1 that round).
      Add the new verdict-label i18n strings (`"YOU SAVED"`, `"YOU SACRIFICED"`, etc.) — reuse the sacrifice/save distinction already threaded via `pack.format`.

- [ ] **Step 3: Update/add tests for all four screens, run them**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(result): winner-highlight + loser-pills round rows (T9)" -- src/features/result/EliminationResultScreen.tsx src/features/result/NxNResultScreen.tsx src/features/result/HeadToHeadResultScreen.tsx src/features/result/RankResultScreen.tsx`
      (include each screen's .test.tsx explicitly)

---

### Task 10: Hero — mock-aligned copy + compact stat row

**Files:**

- Modify: `src/features/result/ResultHero.tsx`

- [ ] **Step 1: Align hero copy with the mock**
      Eyebrow: `t("label")`="Result" → `"RUN COMPLETE"`. H1: current `t("heroTitle")`="Your run is complete" → mock's `"Here's what you saved"` (format-aware: adapt for sacrifice_one, 1v1, nxn, rank_blind the same way Solo Play's `packTitle` logic branches per format — check the audit transcript's `renderVals()` for the exact per-format phrasing pattern and mirror it). Subtitle: current plays-recorded count text → mock's `"Your picks are recorded and folded into this pack's stats."`
      Keep the pack title in `ResultHero`'s existing subtitle slot (already correct per the prior D5/T11 decision — do not move it back into the h1).

- [ ] **Step 2: Add the compact mono heroStats row**
      Mock: a right-aligned row of 2 stats for solo (ROUNDS, TOTAL PLAYS) in a mono/uppercase style, distinct from the existing richer `StatTile` cards (Agreement %/Top pick/Rare pick from `summarizeResult()`).
      Decision: ADD this compact row alongside the existing richer stat tiles rather than replacing them — `totalRounds`/`totalPlays` are simple derived numbers the mock treats as the primary hero stats, while the Agreement/Top-pick/Rare-pick tiles are a deliberate richer addition from the original D5 decision that the mock doesn't show but isn't wrong to keep. Place the compact row per the mock's position (top-right of the hero band); keep the richer tiles in their current position below/beside it. If visually cluttered once both are in place, flag it in the PR for a follow-up trim rather than deleting either during this task.

- [ ] **Step 3: Update/add `ResultHero.test.tsx`, run it**

- [ ] **Step 4: Commit**
      `git commit -m "refactor(result): align hero copy + add compact stat row (T10)" -- src/features/result/ResultHero.tsx src/features/result/ResultHero.test.tsx`

---

### Task 11: Leaderboard as an aside card

**Files:**

- Modify: `src/features/result/TopPickedTable.tsx`, `src/features/result/PodiumTable.tsx`, `src/features/result/result-table.tsx`

- [ ] **Step 1: Restyle into a `#171A22` rounded-20 aside card**
      Currently a full-width `<table>` in the main content flow. Move into (or wrap as) a card matching the mock's aside-card treatment, meant to sit in `ResultScreen`'s new aside (Task 8).

- [ ] **Step 2: Thread `ownPicks` through for "mine" bolding**
      Mock bolds an item's name if the viewer picked it at some point (`mine` flag). `ownPicks` isn't currently passed into `TopPickedTable`/`PodiumTable` (only `items`/`label`) — thread it through and compute a `mine` set (item ids present in `ownPicks`) to bold matching rows.

- [ ] **Step 3: Change initial shown-row count from 10 to 5**
      Both `TopPickedTable.tsx` and `PodiumTable.tsx` currently default `PAGE = 10`; mock starts at 5 with a "Show N more" button. Change the constant; keep the existing "show more" pagination mechanics.

- [ ] **Step 4: Confirm gold/silver/bronze #1 highlighting stays as-is**
      `result-table.tsx`'s `MEDAL_STYLES` already matches the mock's gold-for-#1 treatment — no change needed there, just don't regress it while restyling the surrounding card.

- [ ] **Step 5: Update/add tests, run them**

- [ ] **Step 6: Commit**
      `git commit -m "refactor(result): leaderboard as aside card, thread ownPicks for mine-bolding (T11)" -- src/features/result/TopPickedTable.tsx src/features/result/PodiumTable.tsx src/features/result/result-table.tsx`
      (include .test.tsx files explicitly)

---

### Task 12: Share/CTA aside card consolidation

**Files:**

- Modify: `src/features/result/ResultAgainPanel.tsx` (becomes the aside card, or is merged into a new one)
- Modify: `src/features/result/ResultActions.tsx` (sticky-bar buttons may shrink/relocate)
- Modify: `src/features/result/ResultScreen.tsx` (wire the consolidated card into the Task 8 aside)

- [ ] **Step 1: Build one aside card matching the mock's Share panel**
      Title `"Share your run"` (solo) + note ("A link to this exact run, so friends can see what you chose before they play.") + primary cyan button `"Copy share link"` (reuse `ShareButton`'s existing copy-link capability) + two secondary outline buttons: `"Back to pack"` (existing capability) and a second slot that in the mock is `"Play with friends"` — **replace this specific button with something in-scope**, e.g. `"Play again"` (reuse `readLastPlayId`/play-again capability that currently lives in `ResultAgainPanel.tsx`), since "Play with friends" is out of scope per this plan's header.

- [ ] **Step 2: Decide what stays in the sticky top bar vs. moves to the aside card**
      `ResultActions.tsx` currently has "Play again"/"Share result" in the sticky bar. Once the aside card carries Share + Play-again, the sticky bar can likely shrink to just the back button (matching every other 2.0.0 screen's sticky-bar pattern) — remove the now-redundant sticky-bar buttons if the aside card fully replaces their function; keep them if there's a real reason a fixed-position action is still needed (e.g. mobile where the aside might not always be visible — check responsive behavior before removing).

- [ ] **Step 3: Retire `ResultAgainPanel.tsx`'s old bottom-of-page placement**
      It moves into the aside card built in Step 1 — remove its old full-width bottom-of-page rendering from `ResultScreen.tsx` (already partially handled by Task 8's restructure; coordinate).

- [ ] **Step 4: Update/add tests across all three files, run them**

- [ ] **Step 5: Commit**
      `git commit -m "refactor(result): consolidate share/play-again into one aside card (T12)" -- src/features/result/ResultAgainPanel.tsx src/features/result/ResultActions.tsx src/features/result/ResultScreen.tsx`
      (include .test.tsx files explicitly)

---

### Task 13: i18n × 8 locales + e2e + full gates + PR

**Files:**

- Modify: `messages/{uk,ru,ar,ur,hi,bn,zh}.json`
- Modify: `e2e/play.spec.ts`, `e2e/result.spec.ts` (or equivalent — Grep first)

- [ ] **Step 1: Translate every new/changed key from Tasks 1–12 into all 7 non-English locales**
      Preserve each locale's existing tone/register.

- [ ] **Step 2: `npm run test -- catalogs`**

- [ ] **Step 3: Fix e2e selectors broken by the layout restructures (esp. Tasks 7, 8, 9, 12)**
      `npm run test:e2e -- play result` (adjust to actual spec file names).

- [ ] **Step 4: Full local gates**
      `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.

- [ ] **Step 5: `pr-review-toolkit:code-reviewer` on the full branch diff**
      Fix any Critical/Important findings, re-review until clean. Pay special attention to Task 7 (RankPlayScreen restructure) and Task 9 (four screens touched) for regressions in existing game logic — this plan explicitly requires ZERO behavior change to picking/ranking mechanics, only presentation.

- [ ] **Step 6: Open PR into `release/2.0.0`, self-merge per standing 2.0.0 authorization**
      State all gate results in the PR body (no CI runs on `release/*`). Delete the branch after merge.
