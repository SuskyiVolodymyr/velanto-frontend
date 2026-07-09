# Feedback Board Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the `/feedback` board, `/feedback/new` create form, and `/feedback/[id]` detail (vote + comments + staff status/delete), plus a public nav link — consuming the shipped backend API.

**Architecture:** Next.js 16 App Router. Thin Server-Component route wrappers in `app/feedback/*` render `"use client"` feature components in `src/features/feedback/*`. A `feedbackClient` in `src/shared/lib/` wraps the shared `apiClient`; types in `src/shared/types/feedback.ts` (re-declared locally, never imported from backend). Ships in hardcoded English (only the header nav label is translated). Mirrors proven files: `SupportScreen`, `HomeFeed`, `SupportReportScreen`, `VoteButtons`, `CommentSection`, `CreatePackForm`, `reports-client`.

**Tech Stack:** React 19, Tailwind v4, Vitest + React Testing Library. Commands: `npm run typecheck`, `npm run lint`, `npm test` (`vitest run`).

**Prereq:** the backend `feature/feedback-list-own-private` PR is merged first. Work on branch `feature/feedback-frontend` (already created; spec committed there).

**Design:** `docs/superpowers/specs/2026-07-09-feedback-frontend-design.md`.

**Mirror these files (read before each task):**
- Client: `src/shared/lib/reports-client.ts` + `src/shared/lib/api-client.ts`; vote/list variants `packs-client.ts`, `comments-client.ts`. Types: `src/shared/types/report.ts`.
- Board: `src/features/support/SupportScreen.tsx` (filters + load-more), `src/features/home/HomeFeed.tsx` (debounced search + conditional group).
- Detail/staff: `src/features/support/SupportReportScreen.tsx`; vote `src/features/pack/VoteButtons.tsx`; comments `src/features/pack/CommentSection.tsx`.
- Form: `src/features/create/CreatePackForm.tsx`.
- Auth: `src/shared/lib/auth-context.tsx` (`useAuth`), roles `src/shared/lib/staff-permissions.ts`.
- Nav: `src/shared/components/AppHeader.tsx`; catalog `messages/en.json`.
- Test mirrors: `src/shared/lib/reports-client.test.ts`, `src/features/pack/VoteButtons.test.tsx`, `src/features/pack/CommentSection.test.tsx`.

---

## Task 1: Types + client (+ client test)

**Files:**
- Create: `src/shared/types/feedback.ts`
- Create: `src/shared/lib/feedback-client.ts`
- Create: `src/shared/lib/feedback-client.test.ts`

- [ ] **Step 1: Write** `src/shared/types/feedback.ts` (mirror `report.ts`'s header comment about local re-declaration):

```ts
// Local re-declaration of the backend feedback API shapes. NOT imported from
// the backend (the repos share no types package).

export type FeedbackTopic = 'bug' | 'feature' | 'translation' | 'other';
export type FeedbackVisibility = 'everyone' | 'staff_only';
export type FeedbackStatus = 'new' | 'in_progress' | 'done' | 'declined';
export type FeedbackSort = 'new' | 'top';

export interface Feedback {
  id: string;
  topic: FeedbackTopic;
  title: string;
  body: string;
  visibility: FeedbackVisibility;
  status: FeedbackStatus;
  authorId: string;
  authorUsername: string;
  handledById: string | null;
  locale: string | null;
  translationContext: string | null;
  translationSuggestion: string | null;
  createdAt: string;
  updatedAt: string;
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
  commentCount: number;
}

export interface FeedbackList {
  items: Feedback[];
  total: number;
  page: number;
  limit: number;
}

export interface FeedbackComment {
  id: string;
  feedbackId: string;
  authorId: string;
  authorUsername: string;
  body: string;
  createdAt: string;
}

export interface FeedbackCommentList {
  items: FeedbackComment[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateFeedbackInput {
  topic: FeedbackTopic;
  title: string;
  body: string;
  visibility: FeedbackVisibility;
  locale?: string;
  translationContext?: string;
  translationSuggestion?: string;
}

export interface ListFeedbackFilters {
  q?: string;
  topic?: FeedbackTopic;
  status?: FeedbackStatus;
  sort?: FeedbackSort;
  page?: number;
  limit?: number;
}

export interface FeedbackVoteResult {
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
}
```

- [ ] **Step 2: Write failing** `src/shared/lib/feedback-client.test.ts` (mirror `reports-client.test.ts`: `vi.mock('@/src/shared/lib/api-client')`, assert each method calls `apiClient.<verb>` with the exact path + query). Cover: `list()` → `/feedback`; `list({ q:'x', topic:'bug', sort:'top', page:2, limit:3 })` → `/feedback?q=x&topic=bug&sort=top&page=2&limit=3` (assert only-defined params, order per `buildListQuery`); `getById('id')` → `/feedback/id`; `create(input)` → post `/feedback`; `setStatus('id','done')` → patch `/feedback/id/status` with `{ status:'done' }`; `remove('id')` → delete `/feedback/id`; `vote('id',1)` → post `/feedback/id/vote` `{ value:1 }`; `listComments('id',{page:1,limit:10})` → `/feedback/id/comments?page=1&limit=10`; `addComment('id',{body:'hi'})` → post `/feedback/id/comments` `{ body:'hi' }`.

Run: `npm test -- feedback-client` → FAIL (module missing).

- [ ] **Step 3: Write** `src/shared/lib/feedback-client.ts` (mirror `reports-client.ts`):

```ts
import { apiClient } from '@/src/shared/lib/api-client';
import type {
  CreateFeedbackInput,
  Feedback,
  FeedbackComment,
  FeedbackCommentList,
  FeedbackList,
  FeedbackStatus,
  FeedbackVoteResult,
  ListFeedbackFilters,
} from '@/src/shared/types/feedback';

function buildListQuery(filters: ListFeedbackFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.topic) params.set('topic', filters.topic);
  if (filters.status) params.set('status', filters.status);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page !== undefined) params.set('page', String(filters.page));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function buildPageQuery(p: { page?: number; limit?: number }): string {
  const params = new URLSearchParams();
  if (p.page !== undefined) params.set('page', String(p.page));
  if (p.limit !== undefined) params.set('limit', String(p.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const feedbackClient = {
  list: (filters: ListFeedbackFilters = {}) =>
    apiClient.get<FeedbackList>(`/feedback${buildListQuery(filters)}`),
  getById: (id: string) => apiClient.get<Feedback>(`/feedback/${id}`),
  create: (input: CreateFeedbackInput) =>
    apiClient.post<Feedback>('/feedback', input),
  setStatus: (id: string, status: FeedbackStatus) =>
    apiClient.patch<Feedback>(`/feedback/${id}/status`, { status }),
  remove: (id: string) => apiClient.delete<undefined>(`/feedback/${id}`),
  vote: (id: string, value: 1 | -1) =>
    apiClient.post<FeedbackVoteResult>(`/feedback/${id}/vote`, { value }),
  listComments: (id: string, page: { page?: number; limit?: number } = {}) =>
    apiClient.get<FeedbackCommentList>(`/feedback/${id}/comments${buildPageQuery(page)}`),
  addComment: (id: string, input: { body: string }) =>
    apiClient.post<FeedbackComment>(`/feedback/${id}/comments`, input),
};
```
> Verify `apiClient`'s exact method names/signatures against `api-client.ts` (e.g. whether `delete` takes a type param, how `patch` is called) and adjust to match. Keep the query-string order matching your test's expectations.

- [ ] **Step 4: Run → PASS.** `npm test -- feedback-client`, then `npm run typecheck` clean.

- [ ] **Step 5: Commit** `feat(feedback): types + feedback API client`.

---

## Task 2: Board — `FeedbackScreen` + `FeedbackCard` + route + Top-3 sidebar

**Files:**
- Create: `src/features/feedback/FeedbackCard.tsx`
- Create: `src/features/feedback/FeedbackScreen.tsx`
- Create: `src/features/feedback/FeedbackScreen.test.tsx`
- Create: `app/feedback/page.tsx`

- [ ] **Step 1: Write** `FeedbackCard.tsx` — a presentational card. Props: `{ post: Feedback; compact?: boolean }`. Renders (all `<Link href={`/feedback/${post.id}`}>`): a score badge, a topic chip (Bug/Feature/Translation/Other — map topic→label), a status badge (New/In progress/Done/Declined — map status→label + color), the title, `by {post.authorUsername}`, and `{post.commentCount} comments`. In `compact` mode (sidebar) drop the body/less chrome. Use the app's existing `Text`/`Link` primitives and Tailwind classes consistent with pack/report cards (read a card in `HomeFeed`/`SupportScreen` for class conventions). Add small pure label maps: `TOPIC_LABELS`, `STATUS_LABELS` (export for reuse/testing).

- [ ] **Step 2: Write failing** `FeedbackScreen.test.tsx` (mirror the mocking style of `VoteButtons.test.tsx`): `vi.mock('@/src/shared/lib/feedback-client')`, `vi.mock('@/src/shared/lib/auth-context')` (`useAuth`), `vi.mock('next/navigation')` (`useRouter`). Assert:
  - On mount, calls `feedbackClient.list` (default sort) AND `feedbackClient.list({ sort:'top', limit:3 })` for the sidebar; renders returned items' titles.
  - Typing in the search input (after debounce) calls `list` with `q`.
  - Clicking a topic filter chip calls `list` with that `topic`; clicking a status chip → `status`; toggling sort → `sort:'top'`.
  - Empty result renders the empty message; a rejected fetch renders the error message.
  - "New post" for an authed user navigates to `/feedback/new`; for anon navigates to `/auth?next=/feedback`.
  (Use `vi.useFakeTimers()` or `await waitFor` for the 300ms debounce, mirroring how `HomeFeed` is tested if a test exists; otherwise `waitFor`.)

Run: `npm test -- FeedbackScreen` → FAIL.

- [ ] **Step 3: Write** `FeedbackScreen.tsx` (`"use client"`), mirroring `SupportScreen` (filter chips + load-more) + `HomeFeed` (debounced search). Structure:
  - State: `searchInput`/debounced `q`, `topic`, `status`, `sort` (default `'new'`), `items`, `page`, `total`, `status: 'loading'|'ready'|'error'`, `top3` (sidebar items).
  - Effect A (mount): `feedbackClient.list({ sort:'top', limit:3 })` → `setTop3(r.items)` (guard/ignore errors — sidebar is non-critical).
  - Effect B (debounce): `setTimeout(() => setQ(searchInput.trim()), 300)`.
  - Effect C (keyed on `[q, topic, status, sort]`): reset page to 1, `feedbackClient.list({ q: q||undefined, topic, status, sort, page:1, limit:20 })`, `cancelled` guard, set items/total/status.
  - `handleLoadMore`: fetch next page, append de-duped by id (Set), bump page.
  - Layout: a two-column flex/grid — main column (search input, topic chips row, status chips row, sort toggle, `New post` button, the list of `<FeedbackCard>`, Load-more button, loading/empty/error states) + a right sidebar (`Top feedback` heading + `top3` as `<FeedbackCard compact>`). On small screens sidebar stacks (Tailwind responsive).
  - `New post`: `const { user } = useAuth();` → on click, `router.push(user ? '/feedback/new' : '/auth?next=/feedback')`.
  - Strings hardcoded English.

- [ ] **Step 4: Write** `app/feedback/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { FeedbackScreen } from '@/src/features/feedback/FeedbackScreen';

export const metadata: Metadata = {
  title: 'Feedback — Velanto',
  description: 'Report bugs, suggest features, and propose translation improvements.',
};

export default function FeedbackPage() {
  return <FeedbackScreen />;
}
```
(Match the import style/alias used by `app/support/page.tsx`.)

- [ ] **Step 5: Run → PASS + typecheck.** `npm test -- FeedbackScreen && npm run typecheck`.

- [ ] **Step 6: Commit** `feat(feedback): board screen with search/filter/sort + Top-3 sidebar`.

---

## Task 3: New-post form — `NewFeedbackForm` + route

**Files:**
- Create: `src/features/feedback/NewFeedbackForm.tsx`
- Create: `src/features/feedback/NewFeedbackForm.test.tsx`
- Create: `app/feedback/new/page.tsx`

- [ ] **Step 1: Write** `NewFeedbackForm.tsx` (`"use client"`), mirroring `CreatePackForm` (controlled state, pure `validate`, single error line, pending label). Export a pure `validate(fields): string | null`:
  - title required (non-empty, ≤140); body required (≤4000).
  - if `topic==='translation'`: `locale` required, `translationSuggestion` required (non-empty). (context optional.)
  - returns first error message or null.
  - Component: topic selector (4 `aria-pressed` buttons or a `<select>`); title `<Input>`; body `<textarea>`; visibility toggle (Everyone / Staff-only) + hint. Conditional block when `topic==='translation'`: locale `<select>` (11 locales — reuse `src/i18n/config.ts` `LOCALE_NAMES`/`LOCALES` if exported, else inline list), `translationContext` `<Input>`, `translationSuggestion` `<textarea>`.
  - Auth gate: `const { user, status } = useAuth();` effect → if `status==='unauthenticated'` `router.replace('/auth?next=/feedback/new')`.
  - `handleSubmit`: `validate` → set error+return; build `CreateFeedbackInput` (omit translation fields unless topic is translation); `feedbackClient.create(input)` → `router.push('/feedback/' + created.id)`; on error `setError(messageFromError(err))` (reuse the helper pattern from `CreatePackForm`).

- [ ] **Step 2: Write failing** `NewFeedbackForm.test.tsx`:
  - Unit-test the exported `validate`: bug post with title+body → null; translation post missing locale → error; translation post missing suggestion → error; valid translation post → null; empty title → error.
  - Component: translation fields are NOT in the document for topic `bug`, and ARE present after selecting `translation`. Submitting a valid bug post calls `feedbackClient.create` with the expected payload (no translation fields) and pushes to `/feedback/:id` (mock `create` to resolve `{ id:'new1', ... }`).
  (Mock `feedback-client`, `auth-context` as authenticated, `next/navigation`.)

Run: `npm test -- NewFeedbackForm` → FAIL then implement → PASS.

- [ ] **Step 3: Write** `app/feedback/new/page.tsx` (metadata `New feedback — Velanto`; renders `<NewFeedbackForm/>`).

- [ ] **Step 4: Typecheck + commit** `feat(feedback): new-post form with conditional translation fields`.

---

## Task 4: Detail — `FeedbackDetailScreen` + `FeedbackVote` + `FeedbackComments` + route

**Files:**
- Create: `src/features/feedback/FeedbackVote.tsx`
- Create: `src/features/feedback/FeedbackComments.tsx`
- Create: `src/features/feedback/FeedbackDetailScreen.tsx`
- Create: `src/features/feedback/FeedbackDetailScreen.test.tsx`
- Create: `app/feedback/[id]/page.tsx`

- [ ] **Step 1: Write** `FeedbackVote.tsx` — mirror `VoteButtons.tsx` but for feedback. Props `{ feedbackId; initialScore; initialLikes; initialDislikes; initialMyVote: 1|-1|null }`. `handleVote(value)`: anon → `router.push('/auth?next=' + encodeURIComponent(pathname))`; else `feedbackClient.vote(feedbackId, value)` → set from `FeedbackVoteResult`. Buttons reflect `myVote` (primary/secondary).

- [ ] **Step 2: Write** `FeedbackComments.tsx` — mirror `CommentSection.tsx` for feedback. Props `{ feedbackId }`. Fetch page 1 via `feedbackClient.listComments`; "Load more" appends de-duped; composer `<textarea>` → `feedbackClient.addComment` prepends returned comment + `total+1`; anon sees "Log in to comment".

- [ ] **Step 3: Write** `FeedbackDetailScreen.tsx` (`"use client"`, prop `postId`), mirroring `SupportReportScreen` (staff-gated `<select>` action + delete). Structure:
  - Fetch `feedbackClient.getById(postId)` in effect; states loading/ready/error; on `ApiError` status 404 → a "Not found" message (covers hidden staff_only + deleted).
  - Render: topic chip, status badge, title, body, `by {authorUsername}`, created/updated; if `post.topic==='translation'`, a block showing locale + context + suggestion.
  - `<FeedbackVote .../>` seeded from the post.
  - `<FeedbackComments feedbackId={postId} />`.
  - Staff controls: `const { user } = useAuth(); const isStaff = user?.role==='moderator'||user?.role==='manager'||user?.role==='admin';` If staff: a status `<select>` (New/In progress/Done/Declined) → `feedbackClient.setStatus(postId, value)` then update local status (or refetch). If `isStaff || user?.id===post.authorId`: a **Delete** button → `window.confirm(...)` → `feedbackClient.remove(postId)` → `router.push('/feedback')`.

- [ ] **Step 4: Write failing** `FeedbackDetailScreen.test.tsx`:
  - Renders a fetched post (title/body/author).
  - Staff viewer sees the status `<select>`; changing it calls `setStatus`. Non-staff non-author does NOT see it.
  - Author (or staff) sees Delete; clicking (confirm mocked true) calls `remove` and navigates to `/feedback`.
  - A `getById` rejection with an `ApiError` 404 renders the Not-found state.
  (Mock `feedback-client`, `auth-context`, `next/navigation`; mock `window.confirm`.)

Run: `npm test -- FeedbackDetailScreen` → FAIL then implement → PASS. Also add focused tests for `FeedbackVote`/`FeedbackComments` mirroring `VoteButtons.test.tsx`/`CommentSection.test.tsx`.

- [ ] **Step 5: Write** `app/feedback/[id]/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { FeedbackDetailScreen } from '@/src/features/feedback/FeedbackDetailScreen';

export const metadata: Metadata = { title: 'Feedback — Velanto' };

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FeedbackDetailScreen postId={id} />;
}
```
(Match `app/support/[id]/page.tsx`'s async-params signature.)

- [ ] **Step 6: Typecheck + commit** `feat(feedback): detail screen with vote, comments, staff status + delete`.

---

## Task 5: Nav link (public, top-level)

**Files:**
- Modify: `src/shared/components/AppHeader.tsx`
- Modify: `messages/en.json` (+ the other 10 `messages/*.json`)

- [ ] **Step 1: Add** a `feedback` key to `messages/en.json` under the `header` namespace (e.g. `"feedback": "Feedback"`). Add the SAME key to all 10 other catalogs (`messages/{zh,hi,es,fr,ar,bn,pt,ru,ur,uk}.json`) — translate the single word where obvious, or keep English as a placeholder (header is the extracted surface; next-intl falls back to `en` anyway). Keep each file's `_note` first key intact and JSON valid.

- [ ] **Step 2: Add** a public "Feedback" `<Link href="/feedback">` to `AppHeader.tsx`, using `useTranslations('header')` → `t('feedback')`, placed so it's visible to all users (authed + anon) and doesn't crowd the auth controls on mobile (read the current header layout; mirror how the logo/links are arranged; use logical spacing utilities).

- [ ] **Step 3: Verify + commit** — `npm run typecheck && npm run lint && npm test` (existing header test, if any, still passes; update it if it asserts the header's link set). Commit `feat(feedback): add public Feedback nav link`.

---

## Task 6: Verify, review, manual verify, PR, merge, close #80

- [ ] **Step 1: Full gate** — `npm run typecheck && npm run lint && npm test` all clean/green. Also `npm run build` (catches RSC/`"use server"` and static/dynamic issues that vitest/tsc miss).
- [ ] **Step 2: Review** — dispatch `pr-review-toolkit:code-reviewer` over the branch diff (focus: correct client/query building, visibility-driven UI — staff controls only for staff/author, anon vote/comment redirects, 404 handling, no backend types imported, hardcoded-English consistency, RTL-safe enough for LTR English). Also check `.claude/workflows/` for any repo-specific PR gates (build, ui-guardian). Fix real findings; re-review.
- [ ] **Step 3: Manual browser verification** (per the frontend preview workflow) against the live backend: start the frontend + backend preview servers; as **anon** load `/feedback` (only `everyone` posts, Top-3 sidebar, search/filter/sort); register/log in; create a bug post, a `staff_only` post (confirm it now appears in your own list — needs the backend prereq merged), and a translation post (conditional fields); open a detail, vote (toggle), comment; as a promoted **moderator** account set a status and delete a post. Capture a screenshot of the board. Fix any issues found.
- [ ] **Step 4: PR into `develop`** (frontend **squash-merge** convention). Title `feat(feedback): community board frontend`. Body: what/why, screenshots, `Closes #80` (note: issues auto-close only on merge to the default branch; this repo merges to `develop`, so also plan a manual close or note it closes on the next release to `main`). Wait for green.
- [ ] **Step 5: Merge** to `develop` (squash), sync local, delete branch. Comment on/close velanto-frontend#80 as appropriate. Note sub-project 3 (notifications on status/comment, feedback i18n extraction, public-board SEO) remains as later follow-ups.

---

## Notes for the executor
- **Mirror, don't reinvent:** every screen has a near-twin in the repo — read the mirror file first, copy its structure/classes, swap the client + fields.
- **No backend type imports** — use `src/shared/types/feedback.ts` only.
- **`npm run build` is a real gate** the way `npm run typecheck` is on the backend — an RSC/`"use client"`/`"use server"` violation passes vitest + tsc but fails the build. Run it in Task 6.
- **Hardcoded English** everywhere except the header nav label — matches every other not-yet-extracted screen; no lint forces `useTranslations`.
- **Auth-driven UI is UX-only** — the backend re-validates every action; client role checks just show/hide controls.
