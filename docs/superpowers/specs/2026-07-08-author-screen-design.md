# Author Screen — Design

**Scope:** the public creator profile at `/users/[id]` — velanto-frontend#27. Backend is fully built and merged (follow/unfollow, `GET /users/:id`, ban-history, `authorId` pack filter).

**Written autonomously (2026-07-08, overnight session) per standing authorization**, drawing on this session's earlier scoping research (agent-researched decisions on Follow-button visibility, ban-button placement, MODERATOR-badge omission, "total plays received" omission, own-profile handling, and the anonymous-follow redirect pattern — all resolved with concrete answers, not open questions). Self-reviewed; safe to build directly.

## 1. Route and scope

`/users/[id]` — a dynamic route, distinct from `/profile` (self-view, already shipped). Visiting your own `/users/[id]` is technically valid but the design defers to `/profile` for that case: **hide the Follow and Ban buttons when `user?.id === id`**, no redirect (a redirect risks surprising a user who intentionally clicked their own name somewhere).

Sections, top to bottom:

1. Author header: initials avatar, username, bio (or nothing if null — unlike `/profile`, there's no "add a bio" prompt here since you can't edit someone else's bio).
2. Stats strip: follower count, packs-published count (`GET /packs?authorId=X`'s `total`).
3. Follow/Unfollow button (hidden for own profile).
4. Ban history (moderator+ only, hidden entirely for everyone else — not just visually collapsed).
5. Ban button (moderator+ only, hidden for own profile too even for a moderator viewing themselves).
6. Packs grid, reusing the same grid markup as `/profile`'s "My Packs" (without `showStatus`, since a non-owner viewer only ever receives `approved` packs from the backend for this `authorId` — no pending/rejected badge needed here).

**Explicitly out of scope, confirmed during scoping:**

- "Total plays received" stat — no backend aggregate exists.
- MODERATOR role badge on the author's name — `GET /users/:id` has no `role` field.
- Report-user button — deferred entirely to velanto-frontend#29 (Support), which doesn't exist yet. Hidden, not shown-disabled (a dead affordance with undefined behavior is worse than adding it cleanly later).

## 2. Follow button

- Authenticated, not the author themselves: shows "Follow" or "Following" based on `GET /users/:id`'s `isFollowedByMe`. Clicking toggles via `POST /users/:id/follow` or `/unfollow`, both returning `{ followerCount }` — update the button state and the stats-strip count together from that single response, no second fetch.
- Anonymous viewer: shows "Follow" in a disabled-looking state that, on click, redirects to `/auth?next=${encodeURIComponent(pathname)}` — the dominant pattern already established in 4 other places in this codebase (`CreatePackForm`, `PlayScreen`, `RankPlayScreen`, `HeadToHeadPlayScreen`, `AdminScreen`), not the inline-prompt outlier used once in `CommentSection`. Consistency with the majority wins.
- Own profile: button hidden entirely.

## 3. Ban history and ban button (moderator+ only)

Both are gated on `useAuth().user?.role` being `moderator`, `manager`, or `admin` — client-side gate for UX only, the backend independently re-enforces this on every request (`GET /users/:id/ban-history` is itself `@Roles('moderator','manager','admin')`-gated).

- **Ban history**: fetched only when the viewer is moderator+ (don't fire the request at all for a plain user — it would just 403). Rendered as a flat list (timestamp, `actorUsername`, `meta.duration`/`meta.reason`), reusing the exact `LogsTab.tsx` "Load more" pagination pattern (`{items,total,page,limit}` envelope, cumulative append on load-more).
- **Ban button**: reuses `usersClient.ban()`/`unban()`, `BanDuration`, `formatBanStatus()` — all already built for the admin panel. This is moderators' _only_ ban entry point outside the admin panel itself (the admin panel's `UsersTab` is manager+-only; a plain moderator has no other way to ban anyone). Reuses `UsersTab.tsx`'s exact inline-expanding-form UI pattern (not a popup modal) for consistency with the one existing ban UI in this codebase, even though the original design mock depicted a modal — the admin panel already made this same divergence-from-mock call, and consistency with the existing precedent wins over matching the mock literally.
- Hidden for own profile, even for a moderator viewing themselves (you can't ban yourself, and a moderator viewing their own `/users/[id]` should see the same clean page a `/profile` visitor would expect).

## 4. Packs grid

`GET /packs?authorId=X`, no `viewerId` context needed from the frontend (the backend already knows from the JWT whether the caller is the author). For any non-owner viewer this always returns `approved`-only packs — the frontend doesn't need its own visibility logic here, it just renders whatever the backend returns, same `PackCard` grid as `/profile` but without `showStatus` (there's nothing but approved packs to render).

## 5. API client additions needed

`usersClient` gains:

- `follow(id): Promise<{ followerCount: number }>` → `POST /users/:id/follow`
- `unfollow(id): Promise<{ followerCount: number }>` → `POST /users/:id/unfollow`
- `banHistory(id, { page?, limit? }): Promise<{ items: BanHistoryEntry[], total, page, limit }>` → `GET /users/:id/ban-history`, where `BanHistoryEntry = { actorUsername: string, meta: { duration: string, reason: string }, createdAt: string }`

## 6. Error handling / edge cases

- `GET /users/:id` for a nonexistent id: 404 → render a "This user doesn't exist" state, not a crash.
- Follow/unfollow network failure: don't optimistically flip the button state before the request resolves — wait for the real response, show a small inline error on failure, leave the button in its pre-click state (matches this codebase's established "don't optimistically mutate on network calls that can fail" convention from the admin panel's ban/unban handlers).
- A moderator's own ban-history fetch for a target that has never been banned: empty list, "No ban history for this user" message (not an error state).

## Issue breakdown

This is the whole remaining scope of velanto-frontend#27 — no further backend work needed (already merged: follow/unfollow, public profile, ban-history, authorId filter).
