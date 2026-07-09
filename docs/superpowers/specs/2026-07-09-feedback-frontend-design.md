# Feedback Community Board — Frontend (Sub-project 2) Design

**Status:** design approved 2026-07-09.
**Parent feature design:** `velanto-backend/docs/superpowers/specs/2026-07-09-feedback-design.md` (canonical). Backend sub-project 1 is merged (velanto-backend#73). This doc is the frontend design; it also specifies one small **backend prerequisite** tweak.
**Tracking issue:** velanto-frontend#80.

## What we're building

The client for the Feedback community board: a public `/feedback` board (list + search + filters + sort + Top-3 sidebar), a `/feedback/new` create form, and a `/feedback/[id]` detail page (vote + comments + staff status/delete). Ships in **English** (hardcoded, like every other not-yet-extracted screen); a later i18n phase extracts it.

This maps entirely onto existing, proven patterns — no new infrastructure. The design is mostly "which existing file to mirror."

## Backend prerequisite (small, separate PR into `velanto-backend` `develop`, done FIRST)

Today `FeedbackService.list` shows a plain (non-staff) viewer only `everyone` posts, so a user who files a `staff_only` post can't see it on the board. Per the approved UX, an authenticated non-staff viewer should also see **their own** `staff_only` posts.

- **Change:** in `FeedbackService.list`, build the visibility clause as:
  - anon (no viewer): `visibility = 'everyone'`
  - staff viewer: no visibility constraint
  - authenticated non-staff viewer: `OR: [{ visibility: 'everyone' }, { visibility: 'staff_only', authorId: viewer.id }]`
- **Where-clause restructure:** the search filter already uses `where.OR = [{title contains}, {body contains}]`. Two independent `OR` groups can't both live on `where.OR`. Combine them under `where.AND = [ <visibilityClause>, <searchClause> ]` (each an `{ OR: [...] }`), adding each only when applicable. `topic`/`status` stay as direct `where` keys. Detail/vote/comment gating (`findById` via `canView`) is unchanged — this only affects the *list*.
- **Tests:** unit — an authed non-staff viewer's list includes their own `staff_only` post and excludes other users' `staff_only`; staff still see all; anon unchanged; search + own-staff_only compose correctly. e2e — user A lists and sees their own `staff_only` post; user B does not.
- Ships as its own backend branch/PR (`feature/feedback-list-own-private`) before the frontend consumes it.

## Architecture (frontend)

Convention (confirmed during exploration): `app/` holds thin Server-Component route wrappers (metadata + render a feature component); `src/features/feedback/` holds the screens (`"use client"`); `src/shared/{lib,types,components}` holds the client, types, and nav. **Backend types are never imported** — re-declare locally in `src/shared/types/feedback.ts`.

### Routes — new
- `app/feedback/page.tsx` → renders `<FeedbackScreen/>`. Exports `metadata` (title/description). No `"use client"`.
- `app/feedback/new/page.tsx` → renders `<NewFeedbackForm/>`.
- `app/feedback/[id]/page.tsx` → `const { id } = await params;` (Next 16 async params) → `<FeedbackDetailScreen postId={id}/>`.

### Types — new: `src/shared/types/feedback.ts`
Mirror `report.ts`. Declare:
- Unions: `FeedbackTopic = 'bug'|'feature'|'translation'|'other'`, `FeedbackVisibility = 'everyone'|'staff_only'`, `FeedbackStatus = 'new'|'in_progress'|'done'|'declined'`, `FeedbackSort = 'new'|'top'`, `FeedbackLocale` (the 11 codes — reuse `src/i18n/config.ts` `LOCALES` if exported, else a local tuple).
- `Feedback` — the full post shape returned by the API (id, topic, title, body, visibility, status, authorId, authorUsername, handledById, locale, translationContext, translationSuggestion, createdAt, updatedAt, score, likes, dislikes, myVote, commentCount).
- `FeedbackList = { items: Feedback[]; total; page; limit }`.
- `FeedbackComment` (id, feedbackId, authorId, authorUsername, body, createdAt) + `FeedbackCommentList`.
- `CreateFeedbackInput`, `ListFeedbackFilters` (q?/topic?/status?/sort?/page?/limit?), `FeedbackVoteResult = { score; likes; dislikes; myVote }`.

### Client — new: `src/shared/lib/feedback-client.ts`
Mirror `reports-client.ts` + `packs-client.ts`, wrapping `apiClient` and a `buildListQuery(filters)` (URLSearchParams, only defined params):
- `list(f = {})` → `GET /feedback{query}` → `FeedbackList`
- `getById(id)` → `GET /feedback/:id` → `Feedback`
- `create(input)` → `POST /feedback` → `Feedback`
- `setStatus(id, status)` → `PATCH /feedback/:id/status {status}` → `Feedback`
- `remove(id)` → `DELETE /feedback/:id` → `undefined` (204)
- `vote(id, value)` → `POST /feedback/:id/vote {value}` → `FeedbackVoteResult`
- `listComments(id, {page,limit})` → `GET /feedback/:id/comments{query}` → `FeedbackCommentList`
- `addComment(id, {body})` → `POST /feedback/:id/comments {body}` → `FeedbackComment`

### Board — `src/features/feedback/FeedbackScreen.tsx` (`"use client"`)
Mirror `SupportScreen.tsx` (filters + load-more) and `HomeFeed.tsx` (debounced search + conditional group). Public — works logged-out (no role gate; anon fetch returns only `everyone` posts).

- **Layout:** two columns. Main = controls + post list. Right sidebar = **Top 3 by rating** — a separate `feedbackClient.list({ sort: 'top', limit: 3 })` fetched once on mount. On narrow screens the sidebar stacks below (responsive; logical Tailwind utilities, consistent with the RTL-aware direction work — but feedback ships LTR English so this is light).
- **Controls:** search `<Input type="search">` debounced 300ms → `q`; topic filter chips (All/Bug/Feature/Translation/Other) via `aria-pressed` buttons; status filter chips (All/New/In progress/Done/Declined); sort toggle (Top | Newest, default Newest = `sort:'new'`). Each control is state that feeds the list `useEffect` deps.
- **Fetch:** `useEffect` keyed on `[q, topic, status, sort]` → `feedbackClient.list({...})`, `cancelled` guard, `status: 'loading'|'ready'|'error'`. Reset to page 1 on filter change. "Load more" appends `result.items` de-duped by id (Set), tracks `page`/`total`.
- **Post card** (`FeedbackCard`): score, topic chip, status badge, title (link to `/feedback/:id`), author username, comment count. Small presentational component; reused by the sidebar (compact variant or same card).
- **"New post"** button: authed → `Link`/router push to `/feedback/new`; anon → routes to `/auth?next=/feedback` (or shows a "Log in to post" prompt). Use `useAuth()`.
- **States:** `Loading feedback…`, empty (`No feedback matches these filters.`), error (`text-[#ff6b6b]`, `Couldn't load feedback. Try again.`).

### New-post form — `src/features/feedback/NewFeedbackForm.tsx` (`"use client"`)
Mirror `CreatePackForm.tsx`: controlled `useState` per field, `<form onSubmit noValidate>`, an exported pure `validate(fields): string | null`, single `error` string above submit, `messageFromError(err)` for server errors, pending submit label.

- **Auth gate:** `useAuth()`; if `unauthenticated`, redirect to `/auth?next=/feedback/new` (effect) — a non-authed user can't reach the form meaningfully.
- **Fields:** topic selector (`aria-pressed` buttons or `<select>`); title `<Input>`; body `<textarea>`; **visibility toggle** (Everyone / Staff-only) via `aria-pressed` buttons or `<select>` with a one-line hint ("Staff-only posts are visible only to you and the team").
- **Conditional translation group:** when `topic === 'translation'`, reveal: locale `<select>` (11 locales by name), `translationContext` `<Input>` ("Which text / where you saw it"), `translationSuggestion` `<textarea>` ("Your suggested wording"). `validate` requires locale + suggestion when topic is translation, and (client-side) ignores/omits those fields otherwise (the backend also rejects them on non-translation posts).
- **Submit:** `feedbackClient.create(input)` → on success `router.push('/feedback/' + created.id)`.

### Detail — `src/features/feedback/FeedbackDetailScreen.tsx` (`"use client"`, prop `postId`)
Mirror `SupportReportScreen.tsx` (staff-gated detail + `<select>` action + delete) composed with `VoteButtons.tsx` and `CommentSection.tsx` patterns.

- **Fetch:** `feedbackClient.getById(postId)` in `useEffect`; handle `ApiError` 404 → a "Not found" state (covers hidden `staff_only` for non-viewers — the API 404s).
- **Body:** topic chip, status badge, title, body, author, created/updated. For a translation post, render the locale + context + suggestion block.
- **Vote control** (`FeedbackVote`, mirrors `VoteButtons`): props from the post (`score`/`likes`/`dislikes`/`myVote`); `feedbackClient.vote(id, value)`; anon → `/auth?next=<pathname>`.
- **Comments** (`FeedbackComments`, mirrors `CommentSection`): `listComments` page 1 + "Load more"; composer `<textarea>` → `addComment`; anon sees "Log in to comment".
- **Staff controls** (role gate `user?.role` ∈ moderator|manager|admin, from `staff-permissions.ts` note — UX only, backend re-validates): status `<select>` (New/In progress/Done/Declined) → `setStatus` (optimistic or refetch); **Delete** button → `remove(id)` then `router.push('/feedback')` with a confirm.
- **Author controls:** if `user?.id === post.authorId`, show the same **Delete** control (author may delete own).

### Nav — modify `src/shared/components/AppHeader.tsx`
Add a public top-level **Feedback** link (visible to everyone, incl. logged-out). Header already uses `useTranslations('header')`, so add a `feedback` key to `messages/en.json`'s `header` namespace (and, to keep catalogs structurally complete, the same key to the other 10 locale files — English value is acceptable as a placeholder there since header is the extracted surface; or translate the single word, consistent with the existing header keys). Verify placement doesn't crowd the auth controls on mobile.

## i18n handling
Feedback **screens** ship hardcoded English strings, exactly like `SupportScreen`, `HomeFeed`, `CommentSection`, `CreatePackForm`, `VoteButtons` today. ESLint does not force `useTranslations`. The **only** translated string is the header nav label (the header namespace is already extracted). A later i18n phase extracts the feedback screens.

## Testing strategy
- **Backend prereq:** unit + e2e (above) in velanto-backend.
- **Client lib** (`feedback-client.test.ts`): mock `api-client`; assert each method hits the exact path + query string (mirror `reports-client.test.ts`).
- **Board** (`FeedbackScreen.test.tsx`): mock `feedback-client` + `useAuth` + `next/navigation`; assert filters/search change the query, "Load more" appends, empty/error states render, "New post" routes appropriately for authed vs anon.
- **Form** (`NewFeedbackForm.test.tsx`): the pure `validate()` (translation-required rules); translation fields appear only for topic=translation; submit calls `create` with the right payload and redirects.
- **Detail** (`FeedbackDetailScreen.test.tsx`): renders a post; vote calls the client; comment composer posts; staff controls appear only for staff/author and call `setStatus`/`remove`; 404 state.
- **Vote/comments** sub-components get focused tests mirroring `VoteButtons.test.tsx` / `CommentSection.test.tsx`.
- **E2E (optional, Playwright):** create a post → see it on the board → open detail → vote. Gate on backend availability like existing e2e.
- **Manual browser verification** (per the frontend workflow) against the live backend: board loads for anon + authed, filters/search/sort/Top-3 work, create flow (incl. a translation post + a staff_only post), vote, comment, and staff status/delete as a promoted account.

## Out of scope (this sub-project)
- Notifications on status-change / new-comment (sub-project 3).
- i18n extraction of the feedback screens (later phase).
- Public-board SEO / SSR of the board (later; the board is client-fetched, consistent with `SupportScreen`).
- A "my feedback" profile tab (the own-`staff_only`-in-list tweak covers the immediate need; a dedicated profile view is a later nicety).
- Editing a post after submit (delete + repost, per the parent design).

## Decomposition / build order
1. **Backend prereq PR** (velanto-backend) — list shows own `staff_only`. Merge to `develop`.
2. **Frontend build** (velanto-frontend, this branch) — types + client → board → new-post form → detail (vote/comments/staff) → nav link → verify/review/manual/PR. Gets its own implementation plan.
