# Pools-and-Rounds — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrate the frontend to the pools-and-rounds pack model the backend now serves (velanto-backend#106). Reusable **groups (pools)** + separate ordered **rounds** whose slots draw from them, with per-group dedup. Covers authoring (create editor), gameplay (play), and results.

**Architecture:** Mirror the backend contract exactly (no shared package — cross-repo-drift snapshots guard it). A frontend `resolveRoundDraws` mirrors the backend engine so create-time feasibility, play-time draws, and results all agree. Picks carry `roundIndex`.

**Tech Stack:** Next 16 App Router, React 19, RHF + zod, Tailwind v4, next-intl (11 catalogs), Vitest+RTL, Playwright.

**Atomicity:** The `Pack`/`Group` type change breaks create AND play AND result at once (all consume the old `selectionMode`/`sampleSize`/`categories`/`versusN`). So this ships as ONE atomic PR — no green intermediate; verify typecheck+tests green at the end. Do NOT merge before velanto-backend#106 is on `develop` (it is).

---

## Wire contract (mirror of backend — the crux)

```ts
// shared/types/pack.ts
export const SLOT_MODES = ["random", "manual"] as const;       // NEW, cross-repo-drift snapshot
export interface Group { id: string; name: string; items: Item[] }   // drop selectionMode/sampleSize
export interface Slot  { groupId: string; mode: "random"|"manual"; count?: number }
export interface Round { id: string; slots: Slot[] }
export interface Pack  { ...; groups: Group[]; rounds: Round[] }      // drop categories/versusRounds/versusN
// REMOVE: Category, SelectionMode
// Pick (plays-client): { roundIndex: number; groupId: string; itemId?: string; position?: number }
```

## Per-format rules (mirror backend create-pack.dto superRefine)

- **Elimination (save_one/sacrifice_one/rank_blind):** each round 1 slot; effective draw ≥2 (random→count, manual→group item count).
- **Versus (nxn/1v1):** each round 2 slots, both `random`, two DISTINCT groups held constant across all rounds; nxn count 1–6/side, 1v1 count 1.
- **Feasibility:** shared `resolveRoundDraws(groups, rounds)` (per-group dedup); hard error only on a 0-draw round; under-fill = soft inline warning (this is where the FE adds value the backend doesn't — show real available count + "not enough for N" warning).

---

## FM1 — Shared contract (foundation)

- [ ] `shared/types/pack.ts`: add `SLOT_MODES`, `Slot`, `Round`; strip `Group` to `{id,name,items}`; `Pack` gets `groups: Group[]; rounds: Round[]`, drop `Category`/versus fields/`SelectionMode`.
- [ ] `shared/types/cross-repo-drift.test.ts`: add `SLOT_MODES` snapshot `["random","manual"]` (RED→GREEN).
- [ ] `shared/lib/packs-client.ts`: `CreatePackInput` → `{ ..., groups: Group[]; rounds: Round[] }` (drop categories/versus).
- [ ] `shared/lib/round-draw.ts` (NEW): `resolveRoundDraws(groups, rounds)` mirroring backend `round-draw.ts` + spec. TDD its dedup/manual/0-draw cases first.

## FM2 — Create editor

- [ ] `create-pack.value-schemas.ts`: `groupValueSchema` drop mode/size; add `slotValueSchema`/`roundValueSchema`; constants: `SLOT_MODES`, `ELIMINATION_MIN_DRAW=2`, `NXN_SIDE_COUNT_MIN=1`/`MAX=6`; remove CATEGORY/versus consts.
- [ ] `create-pack.refinements.ts`: rewrite to `validateElimination`/`validateVersus` + feasibility via `resolveRoundDraws`. TDD (mirror backend dto.spec cases).
- [ ] `create-pack.schema.ts`: `{ ..., groups, rounds }` + per-format superRefine.
- [ ] `create-pack.defaults.ts`: `newGroup()` (no mode/size), `newSlot()`, `newRound()`, versus round generator.
- [ ] Pool editor: adapt `GroupEditor`/`GroupsSection` → pool (name + items only; drop mode/sampleSize UI). Keep `GroupItemAdder`/`use-group-item-draft` (already youtube-validated).
- [ ] `RoundsEditor` (NEW, elimination): ordered rounds; each round = group picker + mode + count; "set count for all rounds"; inline feasibility warning per round (real available count).
- [ ] `VersusEditor` (NEW, nxn/1v1): two-group picker + round count + per-side count → generates `rounds`. 1v1 pins count=1.
- [ ] `CreatePackForm.tsx`: submit `{ groups, rounds }`; render Pools + (RoundsEditor | VersusEditor) by format. Remove `CategoriesSection`/`CategoryEditor`.
- [ ] i18n: new keys (rounds, slot mode, count, set-for-all, feasibility warning, versus round-count) across all 11 catalogs; remove dead category/versus keys.
- [ ] Component + schema tests.

## FM3 — Play + results

- [ ] `round-sampling.ts` / `use-play-session.ts`: walk `rounds` via `resolveRoundDraws` dedup; draw actual random items client-side; picks carry `roundIndex`.
- [ ] Play screens (`PlayRouter`/`PlayScreen`/`VersusRound`/`HeadToHeadPlayScreen`/`RankPlayScreen`): round-based; versus records chosen side groupId.
- [ ] `plays-client.ts` record payload → `{ picks: [{ roundIndex, groupId, itemId?, position? }] }`.
- [ ] `shared/types/play-results.ts` + result screens: per-round (`roundIndex`) results for all formats.
- [ ] Playwright `e2e/*.spec.ts`: create + play flows to new shape.

## Verification

`npm run typecheck` + `npm test` (vitest) + `npm run test:e2e` (Playwright) green; push, CI is the gate.
