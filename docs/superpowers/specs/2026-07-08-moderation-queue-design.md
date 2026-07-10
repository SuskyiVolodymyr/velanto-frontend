# Pack Moderation Queue — Design Spec

**Issue:** frontend#54 ("Pack moderation: pending-review UX + moderator approval queue").

## Scope check against the issue

The issue lists two pieces of work:

1. A "pending review"/"rejected" badge on the creator's own Profile "My Packs" view.
2. A new moderator+ queue screen listing pending packs with approve/reject actions.

**Item 1 is already fully shipped** — `ProfileScreen.tsx:108` already renders `<PackCard pack={pack} showStatus />`, and `PackCard.tsx` already renders a "Pending review"/"Rejected" `Badge` when `showStatus && pack.status !== "approved"`, with dedicated tests in `PackCard.test.tsx` covering all four cases (pending/rejected/approved/no-showStatus). No further work needed here — this spec covers item 2 only.

## Backend contract (already shipped, `velanto-backend#55`)

- `GET /packs/moderation-queue?page=&limit=` — moderator+, returns `{ items, total, page, limit }` (same `PackList` shape as `GET /packs`), `where: { status: 'pending' }`.
- `POST /packs/:id/approve` — moderator+, no body, returns the updated `PublicPack`.
- `POST /packs/:id/reject` — moderator+, body `{ reason?: string }` (max 500 chars, `.strict()`), returns the updated `PublicPack`.
- `GET /packs/:id` already lets moderator+ view a pending pack's full content (visibility gate: `pack.status !== 'approved' && !isOwner && !isModeratorPlus` → 404) — so the queue can link "View" straight to the existing `/packs/:id` route with zero new detail-page work.

## UI

New top-level screen at `/moderation`, moderator+-gated (`moderator`/`manager`/`admin` — matches the endpoint's own `@Roles`), following `SupportScreen.tsx`'s exact template:

- Same auth-gating boilerplate: `loading` → null, unauthenticated → redirect, non-allowed role → redirect to `/`, `if (!allowed) return null` before the main render.
- Same fetch/pagination shape: `status` state (`loading`/`ready`/`error`), a `useEffect` on mount calling `packsClient.moderationQueue({ page: 1, limit: PAGE_SIZE })`, `handleLoadMore` bumping `page` and deduping by id via `Set`, separate `loadingMore`/`loadMoreError` state.
- No filter chips needed (unlike Support's status filter) — the queue is inherently "pending only," there's nothing to filter by.

**Row layout:** each pending pack renders as a card/row showing title, format badge, truncated description, and three actions:

- **View** — `Link href={`/packs/${pack.id}`}` (opens in the same tab; moderator can read the full pack before deciding, then use browser back or re-visit `/moderation`).
- **Approve** — a button that calls `packsClient.approve(pack.id)` directly from the row, no confirmation dialog (matches the low-friction, reversible-enough nature of approval — a wrongly-approved pack can still be rejected/removed later via Support's existing `DELETE /packs/:id` moderation path). On success, remove the row from the list (optimistic-after-response, not optimistic-before — wait for the 200 before removing, to avoid a false "approved" flash on a network error).
- **Reject** — expands an inline reason textarea (`maxLength={500}`) with a "Confirm reject"/"Cancel" pair, rather than a full modal — mirrors the low-ceremony, single-row-scoped nature of the action and avoids introducing a new modal component for one screen. Reason is optional (backend allows empty), so "Confirm reject" is enabled even with an empty textarea. On success, remove the row from the list.
- Both actions show a per-row `busy` state (disable the row's buttons while in flight) and a per-row error message on failure (does not remove the row, matching `HomeFeed`'s existing fetch-error display convention of an inline `Text` error rather than a toast).

**Empty state:** "No packs waiting for review." (matches `HomeFeed`'s "No packs match these filters yet." tone).

## Data flow

- New `packsClient` methods:
  - `moderationQueue: (filters: { page?: number; limit?: number } = {}) => apiClient.get<PackList>(`/packs/moderation-queue${buildListQuery(filters)}`)` — reuses the existing `buildListQuery` helper (it already only serializes `page`/`limit` when those two fields are set; passing an otherwise-empty filters object is safe since every other field is `undefined`).
  - `approve: (id: string) => apiClient.post<Pack>(`/packs/${id}/approve`)`
  - `reject: (id: string, reason?: string) => apiClient.post<Pack>(`/packs/${id}/reject`, { reason })`
- New route: `app/moderation/page.tsx` (thin Server Component, `metadata.robots.index: false`, mirrors `app/support/page.tsx`) rendering `src/features/moderation/ModerationQueueScreen.tsx`.
- New nav link in `UserMenu.tsx`: a "Moderation" (or "Review queue") entry alongside the existing "Support" link, same `moderator || manager || admin` gate, positioned next to Support since both are moderator+ staff screens (Admin stays admin/manager-only, unchanged).

## Testing

- Unit tests for the three new `packsClient` methods (Vitest, matching `packs-client.test.ts`'s existing mock pattern).
- Component tests for `ModerationQueueScreen` (Vitest + RTL, matching `SupportScreen.test.tsx`'s conventions if it exists — check first): role gating (redirect non-moderator+, render for moderator+), queue rendering, approve removes a row, reject-with-reason removes a row, reject-with-empty-reason still works, per-row error on a failed action leaves the row in place, "Load more" pagination.
- Manual browser verification via Claude Preview: log in as a moderator (or promote a test account via `npm run set-role`), submit a pack that lands as pending, confirm it appears in `/moderation`, approve one pack and reject another (with a reason), confirm both leave the queue and the approved one now appears on the public Home feed while the rejected one shows "Rejected" on the author's own Profile.

## Out of scope

- No bulk actions (approve/reject multiple at once) — not requested, queue is expected to be small.
- No re-review of already-approved/rejected packs from this screen — Support's existing report/delete flow already covers post-approval moderation action.
