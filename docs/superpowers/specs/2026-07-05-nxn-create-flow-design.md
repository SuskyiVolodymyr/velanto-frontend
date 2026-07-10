# NxN Create-flow support — design

## Goal

Let users create `nxn` ("versus") packs from `/create`, matching the backend support that already landed (velanto-backend #22/#23). Out of scope: Play/Result screens for nxn (backend rejects those too, tracked separately) and any format beyond the 3 already supported.

## Data model additions (`src/shared/types/pack.ts`)

- `PackFormat`: add `"nxn"` to the existing `"save_one" | "sacrifice_one"` union.
- New `Category` type: `{ id: string; name: string; items: Item[] }` (reuses the existing `Item` type — same shape as `Group.items`).
- `CreatePackInput` (`src/shared/lib/packs-client.ts`): `groups` becomes optional; add optional `categories: Category[]`, `versusRounds?: number`, `versusN?: number`.

## UI changes (`CreatePackForm.tsx`)

- Add a third format button ("NxN" / "Versus") alongside the existing two.
- Conditionally render:
  - `format !== "nxn"` → existing Groups section (`GroupEditor` list), unchanged.
  - `format === "nxn"` → two fixed `CategoryEditor` slots (category count is fixed at 2, matching backend's `CATEGORY_COUNT`) + two number inputs, `versusRounds` (1–30) and `versusN` (1–6).
- Switching format clears the fields not relevant to the new format (mirrors backend's mutual-exclusion rule — sending both `groups` and `categories` is rejected).

## New component: `CategoryEditor.tsx`

Parallel to `GroupEditor` but simpler — no `selectionMode`/`sampleSize` (nxn categories are flat item pools sampled at play time, not pre-split into rounds). Props: `{ category: Category; index: number; onChange; onRemove? }`. Since count is fixed at 2, no add/remove-category affordance — only item add/remove within each fixed category.

## Client-side validation (mirrors backend `superRefine`, for immediate feedback before hitting the API)

- nxn: exactly 2 categories, each with ≥1 item; `versusRounds` and `versusN` both required and in range; every category's item count ≥ `versusN`.
- non-nxn: unchanged existing groups validation.
- Server remains the source of truth — client validation only improves UX, doesn't replace the 400 handling already in place.

## Testing

- Extend `CreatePackForm.test.tsx`: format switch renders the right section; nxn submission builds the right payload; validation errors for <2 categories / missing versusRounds / versusN exceeding item count.
- New `CategoryEditor.test.tsx` mirroring `GroupEditor`'s existing test patterns (add/remove item, text vs youtube item).
- No new e2e test needed beyond extending the existing `create-pack.spec.ts` pattern if the format switch is easy to cover there; skip if it adds only marginal coverage over the unit tests (existing e2e only covers save_one already — consistent with that precedent).

## Self-review

- No placeholders/TBDs.
- Consistent with backend's `CATEGORY_COUNT = 2`, `MIN/MAX_VERSUS_ROUNDS` (1–30), `MIN/MAX_VERSUS_N` (1–6) — see `velanto-backend/src/modules/packs/types/nxn.ts`.
- Scope is a single frontend feature (no backend changes) — appropriately sized for one issue/branch/PR.
- No ambiguity: category count fixed at 2 (no add/remove-category UI), matching the backend's hard requirement.
