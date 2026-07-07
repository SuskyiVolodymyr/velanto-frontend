# 1v1 format — frontend design

## Goal
Add frontend support for the `1v1` pack format (velanto-frontend#24): Create, Play, Result. Backend support already shipped (velanto-backend#28, PR #38, merged) — this is the frontend-only follow-up, same split used for nxn and rank_blind before it.

## Mechanic (per `.claude/docs/domain-rules.md` #25-26, `screen-inventory.md` #6/#36, and `design/extracted/design_handoff_vilante/screens/Vilante Play 1v1.dc.html`)
Sequential pairwise matchups — "just pair after pair," no bracket. Backend already settled the data-shape question (see `velanto-backend/docs/superpowers/specs/2026-07-07-1v1-design.md`): a 1v1 pack is `groups: Group[]` exactly like save_one/sacrifice_one, where **each group is one matchup constrained to exactly 2 items** (manual mode: `items.length === 2`; random mode: `sampleSize === 2`), and picks/results reuse the save_one wire shape and `PackResults` (`count`/`percentage`) completely unchanged.

**The one real UI-level decision this spec has to make:** does Play reuse `PlayScreen`'s existing reveal-then-pick flow (`Show next`/`Show all`, matching save_one/nxn), or does it show both items immediately and let the player pick right away? Resolved by re-reading `screen-inventory.md`'s own interaction-pattern catalog (line 36): "逐个揭示模式 (Play/Play NxN/Play Rank)" lists exactly three screens that use progressive reveal — **Play 1v1 is not among them**. This matches the mock precisely: both cards render at full detail the instant a matchup loads, no "Show next" control exists anywhere in `Vilante Play 1v1.dc.html`, and clicking a card immediately records the pick and advances to the next matchup (the mock's `pick(side)` handler does both in one step, no separate confirm click). So: **no reveal step, no confirm step** — click a card, immediately advance.

## Data model decision
**Pack content:** no new type. `Pack.format` (`src/shared/types/pack.ts`) widens to include `"1v1"`; `Pack.groups` is already optional and already typed `Group[]`, so a 1v1 pack needs zero new fields.

**Picks:** no change to `RecordedPick` — a 1v1 pick is `{groupId, itemId}`, identical to save_one's shape (`position` stays absent, exactly like save_one/sacrifice_one/nxn).

**Results:** no new type. `PackResults.format` (`src/shared/types/play-results.ts`) widens to include `"1v1"`. Verified by reading `PackStats.tsx` and `ResultScreen.tsx`: both already branch only on `results.format === "rank_blind"` vs. everything else, and the "everything else" path renders generic `{itemTitle} — {percentage}%` copy with no save_one-specific wording baked in — **1v1 results need zero rendering changes**, only the type-level format widening so TypeScript accepts a 1v1 `PackResults` value flowing through the same components nxn already flows through unchanged.

## Component changes

### Create (`src/features/create/CreatePackForm.tsx`)
- Add a 5th format button (`"1v1"`), following the exact pattern of the `rank_blind` button already there.
- `format === "nxn" ? <Categories editor> : <Groups editor>` — 1v1 falls into the `else` branch **unchanged**, exactly like rank_blind does today. `GroupEditor.tsx` needs no changes.
- `validate()` gets a new 1v1-specific branch (mirroring the backend's `HEAD_TO_HEAD_ROUND_SIZE` check in `create-pack.dto.ts`'s `superRefine`, and the existing `nxn` branch's style in this same function): every group must resolve to exactly 2 items — `selectionMode === "manual" ? items.length === 2 : sampleSize === 2` — else return a message like `` `Group "${group.name}" needs exactly 2 items for a 1v1 matchup.` `` (manual) or `` `Group "${group.name}" needs a sample size of exactly 2 for a 1v1 matchup.` `` (random). This runs instead of the generic groups-format validation (which only checks "at least one item"), not in addition to it — same relationship the backend's 1v1 `superRefine` branch has to its own shared fallback.
- Payload builder (`handleSubmit`): 1v1 already falls into the `else` branch (`{title, description, coverTone, format, tags, groups}`) unchanged, since that branch is keyed on `format === "nxn"`, not an allowlist of groups-formats.

### Play — new `src/features/play/HeadToHeadPlayScreen.tsx`
A dedicated screen (not a branch inside `PlayScreen.tsx`) — same precedent as `RankPlayScreen.tsx`, justified by the genuinely different interaction model (no reveal/confirm step) rather than just file-size hygiene. Structure:
- `groups = pack.groups ?? []`, `totalRounds = groups.length`, `roundIndex` state (0-indexed), `history: {winnerTitle: string; loserTitle: string}[]` state, `allPicks: RecordedPick[]` state.
- Per round: `resolveRoundCandidates(group)` (reused unchanged from `round-sampling.ts` — manual mode returns both authored items in order; random mode returns a fresh 2-item shuffle sample). Since the backend guarantees every 1v1 group resolves to exactly 2 items, `candidates` is always length-2 here.
- Render both candidates as side-by-side cards with a "VS" divider between them (visually following `VersusRound.tsx`'s two-card-plus-divider layout, but simplified: no `revealedCount` prop needed since both cards always show full detail immediately — pass a new lightweight presentational component, `HeadToHeadRound.tsx`, taking `{left: Item; right: Item; onPick: (id: string) => void}`, no reveal state at all).
- Click a card → immediately: append `{groupId, itemId}` to `allPicks`, append `{winnerTitle, loserTitle}` to `history`, advance `roundIndex`. No separate confirm button (matches the mock's one-step `pick(side)`).
- Finished state (`roundIndex >= totalRounds`): "All matchups done. You picked a winner in N head-to-heads." + a list of `history` entries ("X beat Y", mirroring the mock's struck-through loser styling) + link to Result. Same auth-gate-if-unauthenticated and record-once-via-`useRef` pattern as `RankPlayScreen.tsx`/`PlayScreen.tsx` (`playsClient.record` → `writeLastPlayPicks` on success only).
- Progress bar/label: `Matchup {roundIndex + 1} of {totalRounds}` while playing, matching the mock's `progressLabel`.

### Routing (`app/packs/[id]/play/page.tsx`)
Add a third branch: `pack.format === "rank_blind" ? <RankPlayScreen .../> : pack.format === "1v1" ? <HeadToHeadPlayScreen pack={pack} /> : <PlayScreen .../>`.

### Result
No new component, no changes to `ResultScreen.tsx`/`PackStats.tsx`/`RankResultScreen.tsx` — 1v1 results are `PackResults`-shaped and already render correctly through the existing `GroupResultScreen` path once the type union is widened (see Data model decision above).

### Misc format-list gaps (per the pattern that bit `HomeFeed.tsx` during Rank Blind's rollout — check these explicitly, don't rediscover via manual testing)
- `src/shared/lib/pack-display.ts`: `FORMAT_LABELS` needs a `"1v1": "1v1"` entry (TS will refuse to compile without it once `PackFormat` widens — this one's enforced, not optional). `getRoundsCount` needs no change (its `else` branch already does `pack.groups?.length ?? 0`, which is correct for 1v1).
- `src/features/home/HomeFeed.tsx`: `FORMAT_OPTIONS` array needs a `{ value: "1v1", label: "1v1" }` entry — this one is a plain array literal, not type-checked against `PackFormat`, so it will NOT fail to compile if forgotten (exactly how it was missed for rank_blind last time) — must add it deliberately, not rely on TS to catch it.
- `src/features/play/PlayScreen.tsx`: `FORMAT_COPY: Record<Pack["format"], ...>` will fail to compile once `PackFormat` widens — needs a `"1v1"` entry. Since 1v1 packs route to `HeadToHeadPlayScreen` instead (see Routing above), this entry is unreachable dead code purely for exhaustiveness, same treatment as the existing `rank_blind` entry there (empty strings + a comment explaining why).
- `src/features/pack/PackStats.tsx`: no change needed (verified above — already generic).

## Testing
- `CreatePackForm.test.tsx`: 1v1 format button renders and is selectable; `validate()` rejects a 1v1 pack with a manual-mode group that doesn't have exactly 2 items, rejects a random-mode group with `sampleSize !== 2`, accepts a valid 1v1 pack; submit payload for 1v1 matches the groups-format shape (same assertion style already used for save_one/rank_blind there).
- `HeadToHeadPlayScreen.test.tsx` (new, mirroring `RankPlayScreen.test.tsx`'s structure): renders both candidates for the first matchup; clicking one immediately advances to the next matchup and records history; after the last matchup, shows the finished state with correct history entries and a link to Result; records the play via `playsClient.record` exactly once (not per-matchup) after the last pick, matching the existing `recordedRef`-guarded pattern.
- `pack-display.test.ts`: `FORMAT_LABELS["1v1"]` is defined; `getRoundsCount` returns `groups.length` for a 1v1 pack.
- No new tests needed for `ResultScreen`/`PackStats` (no behavior change) beyond whatever type-level fixture updates are needed to keep existing tests compiling once `PackResults.format` widens (same as what happened to `ResultScreen.test.tsx`/`PackStats.test.tsx` during rank_blind's type-widening fallout — check those files compile, fix fixtures if TS complains, but this is expected to be a non-event since `1v1` is a strict superset addition to an already-generic path).
- Manual browser verification (Playwright MCP or live dev server) after implementation: create a 1v1 pack, play it clicking a specific winner each matchup, confirm the Result screen shows 100%/0% for the picked/unpicked item — same verification depth given to nxn and rank_blind before merge.

## Self-review
- No placeholders/TBDs.
- Resolved the one genuine ambiguity (reveal-step or not) by checking the screen-inventory's own interaction-pattern catalog against the actual mock file, rather than assuming consistency with the other three formats — this is a real, cited design decision, not a default.
- Reuses everywhere the backend's own "reuse, don't duplicate" design achieved (results, picks, pack shape); adds a new component only where behavior is genuinely different (Play), matching the same judgment call `RankPlayScreen.tsx` made for Rank Blind.
- Explicitly calls out the array-literal (`FORMAT_OPTIONS`) vs. type-checked (`FORMAT_LABELS`, `FORMAT_COPY`) distinction so the implementer doesn't rely on the compiler to catch every gap, since one of these gaps was missed and only caught by manual testing last time.
- Scoped as frontend-only (issue #24); no backend changes.
