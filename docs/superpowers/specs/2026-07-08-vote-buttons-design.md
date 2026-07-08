# Pack Vote Buttons — Design

**Scope:** velanto-frontend#55 — like/dislike buttons + score display on the Pack detail screen. Backend fully built and merged (velanto-backend#57, PR #64): `POST/DELETE /packs/:id/vote`, `score`/`likes`/`dislikes`/`myVote` on every pack response.

**Written autonomously (2026-07-08, overnight session) per standing authorization.** Self-reviewed; safe to build directly.

## 1. Placement and shape

A new `VoteButtons` client component, rendered on the pack detail page (`app/packs/[id]/page.tsx`) directly below `PackCoverBanner`, above the description — a natural "engagement bar" position, matching where Follow sits relative to the header on `AuthorScreen`.

Two buttons side by side: 👍 with the like count, 👎 with the dislike count (or a text-label fallback like "Like"/"Dislike" plus counts — reuse whatever icon convention this repo already has, check `Badge`/`Button` usage elsewhere for precedent before introducing emoji or an icon library that isn't already a dependency; if none exists, plain text labels are safer than introducing a new icon dependency for one component). The currently-active vote (if any) is visually highlighted (matches the accent-color "active" pattern already used for `AuthorScreen`'s Follow button and `SupportScreen`'s filter chips).

## 2. Interaction

- Authenticated viewer, no existing vote: clicking Like calls `POST /packs/:id/vote {value: 1}`; clicking Dislike calls the same with `{value: -1}`.
- Authenticated viewer, already liked: clicking Like again calls the same endpoint with the same value — the backend's toggle semantics handle "remove my vote" automatically, the frontend doesn't need its own toggle-detection logic beyond always sending the button's own value. Clicking Dislike while currently liked switches in place (also just a normal `POST` call — the backend handles the switch).
- Any viewer, unvoting explicitly: not exposed as a separate UI affordance — per the backend's toggle design, clicking the currently-active button again IS the unvote action. No separate "X" or "remove vote" button needed.
- Anonymous viewer: both buttons are visually present but redirect to `/auth?next=...` on click, matching the exact pattern already established in 5+ places this session (`AuthorScreen`'s Follow, `CreatePackForm`, `PlayScreen`, etc.) — not a disabled/greyed-out state, a clickable-but-redirects state.
- Network failure: don't optimistically flip the UI before the response — wait for the real `{score, likes, dislikes, myVote}` response and update from that, matching this repo's established "don't optimistically mutate on a call that can fail" convention. Show a small inline error on failure, leave the buttons in their pre-click state.

## 3. Data flow

`getPackServer()` already returns the full `Pack` object including `score`/`likes`/`dislikes`/`myVote` once the `Pack` type is updated (backend already sends these fields on every pack response — no new server fetch needed). `VoteButtons` receives the pack's id and initial vote data as props from the Server Component page, then manages its own local state for post-click updates (same pattern as `AuthorScreen`'s follow button receiving `profile` and managing local updates after `follow()`/`unfollow()` calls).

## 4. API client additions

`packsClient` gains:
- `vote(id, value): Promise<{score, likes, dislikes, myVote}>` → `POST /packs/:id/vote`
- `unvote(id): Promise<{score, likes, dislikes, myVote}>` → `DELETE /packs/:id/vote`

(`unvote` is added for completeness/symmetry with the backend API even though the UI never calls it directly per §2 — omitting a thin, already-designed backend capability from the client wrapper would be an arbitrary gap, and a future feature might want it.)

`Pack` type gains `score: number`, `likes: number`, `dislikes: number`, `myVote: 1 | -1 | null`.

## Issue breakdown
This is the entirety of frontend#55's scope.
