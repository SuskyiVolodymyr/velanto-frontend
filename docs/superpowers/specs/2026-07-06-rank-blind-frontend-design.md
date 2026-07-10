# Rank Blind frontend (Create + Play + Result UI) — design

## Goal

Let users create, play, and see results for `rank_blind` packs, matching the backend support that already landed (velanto-backend #27, merged). Rank Blind reuses the exact `groups: Group[]` shape `save_one`/`sacrifice_one` already use — a group is a round, and a round's ranking has one slot per item placed (`sampleSize` slots if `selectionMode: "random"`, else every item). A pick is `{groupId, itemId, position}`, `position` being the 0-indexed slot the item was placed into.

Out of scope: any backend change beyond the small `positionCounts` addition below (velanto-backend#35, filed alongside this spec — a small additive follow-up to the already-merged #27, not a redesign).

## Backend prerequisite (velanto-backend#35)

`RankResultItem` gains `positionCounts: number[]` (index = 0-based position, value = how many plays placed that item there), alongside the existing `timesRanked`/`averagePosition`. This lets the result screen show a player how many other plays agreed with their specific placement, not just an aggregate average. Small, mechanical addition to `PlaysService.getResults()`'s existing `rank_blind` branch — no schema change, derived from data already being aggregated.

## Data model additions

### `src/shared/types/pack.ts`

- `PackFormat`: add `"rank_blind"` to the existing union → `"save_one" | "sacrifice_one" | "nxn" | "rank_blind"`.
- No new content type — `Pack.groups?: Group[]` already covers it (same reuse decision the backend made).

### `src/shared/types/play-results.ts`

- `RecordedPick`: add `position?: number` (mirrors backend's `RecordPlayDto`; absent for non-rank_blind picks).
- `PackResults`: add `format: "save_one" | "sacrifice_one" | "nxn"` — this field already comes back from the backend today but was never typed on the frontend since nothing branched on it; it becomes the discriminant between `PackResults` and the new `RankResults` below.
- New `RankResultItem`: `{ itemId: string; itemTitle: string; timesRanked: number; averagePosition: number; positionCounts: number[] }`.
- New `RankRoundResult`: `{ groupId: string; groupName: string; items: RankResultItem[] }`.
- New `RankResults`: `{ packId: string; format: "rank_blind"; totalPlays: number; rounds: RankRoundResult[] }`.

### `src/shared/lib/get-results-server.ts`

- Return type becomes `PackResults | RankResults`. The fetch/error-handling logic is unchanged — it's already just an untyped JSON passthrough; only the declared return type changes.

### `src/shared/lib/packs-client.ts`

- No change. `CreatePackInput` already has optional `groups`, and rank_blind's create payload is identical in shape to save_one/sacrifice_one's (see Create flow below).

## Create flow (`CreatePackForm.tsx`)

This is the one area that's a near-trivial extension, not a new mechanic:

- Add a fourth format button ("Rank Blind" / "Place each pick blind into a growing ranked list.") alongside the existing three.
- `CreatePackForm`'s only format branch today is `format === "nxn" ? <nxn section/payload> : <groups section/payload>`. Since rank_blind is groups-shaped, it automatically takes the existing `else` branch — same `GroupEditor` list, same "+ Add group" button, same submit payload (`{ ..., groups }`). No new Create component, no new payload branch.
- `validate()`'s existing non-nxn branch (groups length, per-group name/items/selectionMode/sampleSize checks) already covers rank_blind correctly — a rank_blind group has the exact same required fields as a save_one/sacrifice_one group.

## Play flow

### New component: `src/features/play/RankPlayScreen.tsx`

Rendered instead of `PlayScreen` for rank_blind packs (see routing below) — a dedicated component because the state machine (current item → click a slot → round-complete interstitial → next round → final summary) is structurally different from the existing "reveal candidates, pick one, confirm" pattern in `PlayScreen`, not a variant of it. Forcing it into `PlayScreen`'s existing round-unification would make that component branch on two unrelated interaction models.

**State:** `roundIndex`, `placedCount` (how many items placed in the current round), `slots: (string | null)[]` (item ids, indexed by position), `allPicks: {groupId, itemId, position}[]` (accumulated across all rounds so far).

**Per-round candidates:** reuse `resolveRoundCandidates(group)` unchanged (already handles manual = stored order, random = shuffled sample of `sampleSize`) — this array's order _is_ the one-at-a-time presentation queue; the current item is `candidates[placedCount]`.

**Interaction:** the current item is shown as a card; a grid of numbered empty/filled slots (length = `rankSlotCount(group)`, same rule as the backend: `sampleSize` if random, else `candidates.length`) sits below it. Clicking an empty slot places the current item at that index and advances `placedCount`. When `placedCount` reaches the slot count, the round is complete: show a "Round complete" interstitial listing the just-built order (mirrors the design mock's `isRoundComplete` state) with a "Next round →" button, matching the confirm-before-advancing rhythm every other format already has via its own "Next round" button.

**Submission:** picks accumulate across rounds in local state; only after the _last_ round completes does the component call `playsClient.record(pack.id, { picks: allPicks })` once (same one-POST-at-the-end pattern as `PlayScreen`), then `writeLastPlayPicks(pack.id, allPicks)` on success, then show the finished screen with a link to `/packs/:id/result`.

### Routing (`app/packs/[id]/play/page.tsx`)

```tsx
return pack.format === "rank_blind" ? (
  <RankPlayScreen pack={pack} />
) : (
  <PlayScreen pack={pack} />
);
```

## Result flow

### New rendering branch in `src/features/result/ResultScreen.tsx`

`ResultScreen` currently has zero format branching (fully generic over `PackResults`). It gains one check: if `results.format === "rank_blind"`, render a new `RankResultScreen` (or an inline branch — implementation plan decides which keeps the file smallest) instead of the existing percentage-based rendering.

For each round, sorted by `averagePosition` ascending:

- Numbered badge (rank order, 1-based) + item title + caption `avg {averagePosition} · ranked {timesRanked}x`.
- A row of small bars, one per possible position (`#1..#N`, `N` = that round's slot count), height/opacity scaled by `positionCounts[i]` relative to the max count in that item's breakdown.
- If the current player's own last play (`readLastPlayPicks(pack.id)`, extended to also carry `position` now that `RecordedPick` has it) included this `{groupId, itemId}`, highlight the bar at their `position` and show `You placed this #{position+1} · {positionCounts[position] - 1} other plays agreed` (subtracting 1 so the player doesn't count their own play). If the item wasn't in the player's own play for that round (e.g. it wasn't in their random sample that time), show a neutral note instead of a highlight — no crash, no misleading "you placed this" claim.

## Safety nets

- `src/shared/lib/pack-display.ts`: add `rank_blind: "Rank Blind"` to `FORMAT_LABELS` (currently missing — would render `undefined` as a pack's format label on `PackCard`/detail page today if a rank_blind pack existed). `getRoundsCount` needs no change — its existing `pack.format === "nxn" ? versusRounds : groups?.length ?? 0` already falls through correctly for rank_blind, same as save_one/sacrifice_one.
- No changes needed to `app/packs/[id]/page.tsx`'s existing `(pack.format === "nxn" ? pack.categories : pack.groups)?.map(...)` — rank_blind already takes the `pack.groups` branch correctly.

## Testing

- `CreatePackForm.test.tsx`: rank_blind format button renders the groups section (not nxn's), submits the groups-shaped payload.
- New `RankPlayScreen.test.tsx`: single-round manual-mode placement (click item into each slot in order, verify final order); random-mode sampling (slot count matches `sampleSize`, not full item count); multi-round advance through the round-complete interstitial; final POST payload shape (`{groupId, itemId, position}[]`, one entry per round-slot across all rounds); submission fires exactly once (mirrors `PlayScreen`'s `recordedRef` guard).
- New result-rendering tests (in `ResultScreen.test.tsx` or a dedicated file, plan decides): renders sorted-by-averagePosition list for a `RankResults` payload; highlights the player's own position when `readLastPlayPicks` includes that item with a `position`; shows the neutral note when the item is absent from the player's own last play; renders correctly with `totalPlays: 0` (no divide-by-zero display, matching backend's existing convention of returning `0` for empty aggregates).
- `pack-display.test.ts`: `FORMAT_LABELS.rank_blind` exists; `getRoundsCount` for a rank_blind pack returns `groups.length`.
- No new e2e test needed beyond the existing precedent (nxn shipped without one; unit coverage is the bar this repo has been using for new-format work).

## Self-review

- No placeholders/TBDs.
- Backend prerequisite is explicit and scoped (velanto-backend#35), small enough not to need its own brainstorm — it's an additive aggregation change to already-decided data.
- Consistent with the already-merged backend's slot-count rule (`sampleSize` if random, else `items.length`) and wire shape (`{groupId, itemId, position}`).
- Create flow confirmed as a near-zero-new-code extension (reuses `GroupEditor`/groups validation/groups payload wholesale) — no over-building.
- Play and Result flows get dedicated components/branches rather than being forced into the existing `PlayScreen`/generic `ResultScreen` rendering, since their state machines and data shapes are genuinely different, not parametrized variants of the existing ones.
- Scope is a single frontend feature branch (`feature/rank-blind-frontend`) plus one small backend follow-up branch — both appropriately sized for their own issue/PR.
