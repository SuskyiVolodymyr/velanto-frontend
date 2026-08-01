# 2.0.0 — Profile + Profile Edit + Preferences redesign (slice plan)

Date: 2026-07-28
Mocks (ground truth), persisted for this slice (not in `design/extracted/` —
fetched via DesignSync this session):

| Mock         | File                                                                            | Drives                                                    |
| ------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Profile      | `Profile.dc.html` (JSON-wrapped tool result — see note below)                   | the public profile hero, stats, Packs/People/History tabs |
| Profile Edit | `Profile Edit.dc.html` (content-only, markup pattern in a leading comment)      | the dedicated `/profile/edit` page                        |
| Preferences  | `Preferences.dc.html` (content-only, behaviour summarized in a leading comment) | `/settings` (`SettingsScreen.tsx`)                        |

> The Profile mock's raw tool-result JSON is long (~51k chars) and was
> truncated once mid-session; the second half (stats, role-badge derivation,
> follow/tab wiring, `onSaveEdit`) was recovered via a direct byte-offset read
> of the same file. Re-fetch it if this plan's Profile section needs
> re-verification — do not trust a partial re-read.

Surfaces touched: `/users/[id]` (public profile — **not** `/profile`, see D1),
`/profile/edit`, `/settings`.
Branch: one feature branch off `release/2.0.0`, TDD, small commits,
`pr-review-toolkit:code-reviewer` before the PR.

---

## 0. Scope boundary — read this first

This slice is **styling + layout only**, same discipline as the Create Pack
and Solo Play/Results slices. Two real capabilities already exist and are
correct (streamer mode, live accent switching) — restyle their controls,
never their logic. Three things the mocks show do **not** exist in this app
at all yet (a rejected-pack "review outcome" view, three new notification
types, followers/following search) — building any of them is new product
surface, not a redesign, and is explicitly **out of scope** (see D7, D9, D11).

### DO NOT TOUCH (functionally correct, out of scope)

| Area                                                                       | Files                                                                                                                 |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Identity treatment (staff/trusted gradient handle, role pill)              | `src/shared/lib/user-role.ts` (`identityKind`, `nicknameClass`, `identityPill`), `src/shared/components/Username.tsx` |
| Avatar crop engine (zoom slider, round/rect shape, WebP export)            | `src/shared/components/ImageCropModal.tsx`, `src/shared/lib/crop-image.ts`                                            |
| Streamer-mode redaction + per-item reveal                                  | `src/shared/components/Hidden.tsx`, `src/shared/lib/streamer-mode-context.tsx`                                        |
| Live accent switching (localStorage + pre-hydration script + live `--acc`) | `src/shared/lib/theme.ts`                                                                                             |
| Username change: format check + real 409-backed uniqueness                 | `ProfileEditForm.tsx`'s `useChangeUsername`, `USERNAME_PATTERN` (`auth.schema.ts`)                                    |
| Follow/unfollow mutation, follow-list pagination, cache patching           | `src/features/author/api/follow-list.queries.ts`, `useFollowMutation`                                                 |
| Author packs pagination, recently-played pagination                        | `author-packs.queries.ts`, `recently-played.queries.ts`                                                               |
| Notification preferences fetch/set for the 6 EXISTING types                | `notifications.queries.ts`                                                                                            |
| Password change / set-password / add-email flows                           | `PasswordSection.tsx`, `SetPasswordSection.tsx`, `AddEmailForm.tsx`, their schemas                                    |
| OAuth account linking (popup flow, one-shot link cookie)                   | `ConnectedAccountsSection.tsx`                                                                                        |
| Data export + soft-delete account flow                                     | `DangerZoneSection.tsx`                                                                                               |
| `PackCard` (already 2.0.0-redesigned)                                      | `src/features/home/PackCard.tsx`                                                                                      |

### IN SCOPE (visual/structural)

Profile hero restyle (avatar, role badge, stats-as-tab-triggers) + a new
Packs/People/History tab shell; Packs-tab status filter chips (client-side);
Profile Edit's page shell + a new "How it looks" live preview card; a
Settings page shell with a sticky section TOC (mirroring the already-shipped
Legal/Rules pattern) + every section card restyled to the mock's rows;
`AppearanceSection` migrated onto the shared `SwatchPicker`.

---

## 0b. Decision points (do NOT silently resolve these — confirm before implementing)

**D1 — The mock's "Profile" is `AuthorScreen`, not a `ProfileScreen`.**
There is no `ProfileScreen.tsx` in this codebase — the old one was merged
into `AuthorScreen` when `/profile` became a pure redirect (see
`ProfileRedirect.tsx`'s doc comment: _"the old separate ProfileScreen was
merged into AuthorScreen"_). The canonical, shareable, SEO'd profile page is
`app/users/[id]/page.tsx` → `AuthorScreen.tsx`. `/profile`
(`app/profile/page.tsx` → `ProfileRedirect.tsx`) only bounces an
authenticated owner to `/users/{own id}` and shows a login-block for a
signed-out visitor — it is **not** a page to redesign, it has almost no UI.
→ **Redesign target is `AuthorScreen` + its children**
(`AuthorProfileHeader.tsx`, `AuthorPackList.tsx`, `RecentlyPlayedSection.tsx`,
`FollowListModal.tsx`, `FollowUserRow.tsx`), rendered at `/users/[id]`.
`ProfileRedirect.tsx`'s login-block copy may get a light restyle pass (T7)
but its redirect logic is untouched.

**D2 — The mock's tabbed Packs / People / History IA vs today's stacked
sections. Adopt the tabs — it's a reorganization, not new capability.**
`AuthorScreen` today renders `AuthorPackList` and `RecentlyPlayedSection` as
two always-visible stacked sections, with followers/following reachable only
via a `FollowListModal` opened from the stat-count buttons. The mock groups
all three into tabs (`Packs` / `People` / `History`), with the stat row's
count buttons jumping to the matching tab — exactly the `stats[].onSelect`
wiring already shown in the mock's own state.
→ Build a new `ProfileTabs` shell (T2) that renders the existing
`AuthorPackList`, a new inline `PeopleTab` (T3 — the same data `FollowListModal`
already fetches, laid out inline instead of in a modal), and
`RecentlyPlayedSection` (restyled row list instead of a horizontal rail, T5)
as tab panels. `FollowListModal` itself is deleted once `PeopleTab` replaces
its only two call sites (the stat buttons deep-link into the People tab with
the matching sub-tab preselected, not open a modal). This is a pure
reorganization of already-fetched data — no new endpoint.

**D3 — The Profile mock's own inline "Edit profile" modal is a demo
artifact. Do not build it.**
`Profile.dc.html` ships its own simplified `editOpen` modal (avatar
drag-drop, name, bio, one toggle) — but that is the mock file being a single
self-contained demo, not a second real edit surface. The actual dedicated
edit experience is the separate `Profile Edit.dc.html` mock, and this app
already has a real, separate `/profile/edit` route.
→ Keep `/profile/edit` as the one edit surface. The hero's "Edit profile"
button (and a new pencil-badge overlay on the avatar, matching the mock's
`onOpenEdit` affordance) both link to `/profile/edit` — neither opens an
in-page modal.

**D4 — Avatar crop-with-zoom-slider modal already exists. Reuse it, don't
rebuild it.**
The mock's Profile Edit describes a crop modal with a zoom slider on photo
pick. `src/shared/components/ImageCropModal.tsx` (wrapping `react-easy-crop`)
already does exactly this — a zoom `<input type="range" min={1} max={3}
step={0.1}>`, round/rect `cropShape`, WebP export via `crop-image.ts` — and is
already wired end to end via `AvatarSection.tsx` → `AvatarCropModal.tsx` →
`useUpdateAvatar`. This is the _same_ component the Create Pack cover-image
flow uses (`CoverCropModal.tsx`, rect variant).
→ **No new crop engine.** Restyle `AvatarSection`'s trigger area (mock wants
a drag-and-drop zone with "Drag a photo here or click" / "Drop to upload" /
"Replace photo" copy — today it's a plain file-picker button, T9) and the
modal chrome if needed; `ImageCropModal` itself is unchanged.

**D5 — Streamer mode is real, load-bearing, and already does per-item
reveal. Presentation only.**
`PrivacySection.tsx` already wires `useStreamerMode()` to a real
`SegmentedControl` toggle, backed by `streamer-mode-context.tsx`
(`velanto:streamer-mode`). The mock's "Reveal any item individually when you
need to" copy is not a new ask — `Hidden.tsx` already implements exactly
that: `useStreamerModeOrDefault().reveal(id)`, a per-id reveal button, on
avatars/names/comments everywhere in the app.
→ Restyle `PrivacySection`'s two rows (Streamer mode, Show play history) to
the mock's card rhythm; the toggle wiring is untouched.

**D6 — Live accent switching already exists. Presentation only.**
`src/shared/lib/theme.ts` already does everything the mock's `--acc`
live-set behaviour asks for: `ACCENTS` (4 colours, `#00e5ff` default),
`getStoredAccent`/`setStoredAccent` (localStorage + a live
`document.documentElement.style.setProperty("--acc", …)`), and
`getThemeInitScript()` (a pre-hydration blocking script so there's no
flash-of-wrong-accent on reload). `AppearanceSection.tsx` already calls all
of it.
→ **No new capability.** Migrate `AppearanceSection`'s hand-rolled swatch
buttons onto the shared `SwatchPicker` (`swatchStyle="solid"` — the exact
34px ringed-and-checked chip it already renders for pack cover tones), same
`ACCENTS` list, same `handleSelect`. This is a straight component swap, not a
new interaction (T13).

**D7 — The mock's "review outcome" link on a rejected/changes-requested pack
card points at UI that doesn't exist anywhere in this app. Out of scope.**
`Pack.rejectionReason: string | null` exists on the wire type (every pack
fixture carries it) but is **never read or rendered** by any production
component today — not on `PackDetailScreen`, not on the edit page, nowhere.
The mock's `showReview` link opens a `Pack Review Outcome.dc.html` mock this
task was not given and that has no real-app counterpart. Building "see why
your pack was rejected" / "3 items need your edit" is a genuine new feature
(needs a UI to read `rejectionReason`, and `changes_requested` likely needs
data this app doesn't model yet — which items were flagged), not a restyle.
→ **Do not build it.** The Packs tab keeps today's behaviour: a status badge
via `PackCard`'s existing `showStatus` prop, no review-outcome link. File a
follow-up issue instead of scope-creeping it into this slice.

**D8 — Username uniqueness is already backend-checked. Presentation only.**
`ProfileEditForm.tsx`'s `useChangeUsername` already round-trips to the real
endpoint and maps a 409 to `t("usernameTaken")`, after a client-side
`USERNAME_PATTERN` format check. The mock's hardcoded `TAKEN` array is
explicitly commented as _"a stand-in for the real backend 409"_ — it is not
something to port.
→ Keep the 409-is-the-only-uniqueness-authority behaviour. The mock's UX
polish worth adopting: validate on every keystroke once the field has been
touched once (a `tried` flag) rather than only on submit, and show a
"CHANGED" pill once the draft differs from the saved value — both pure UI
state, no new endpoint (T8).

**D9 — People-tab search has no backend support. Cut it.**
The mock's People tab filters `peopleQuery` against the full, in-memory
`FOLLOWERS`/`FOLLOWING` demo arrays. Our real lists are paginated
(`usersClient.followers/following({ page, limit })`, no `q` param) — a
client-side filter would silently only search whatever page happened to be
loaded so far, which is worse than no search. (There IS a real, working
people-search elsewhere — `src/features/home/PeopleFeed.tsx` /
`useUserSearch`, backing the sitewide `/people` route — but that searches
_all users_, not _this profile's followers_, a different endpoint with a
different `q` param the followers/following endpoints don't accept.)
→ **Cut the search box from the People tab** (T3). If per-profile
follower search becomes worth it, it needs a backend `q` param on
`GET /users/:id/followers` first — file it separately, don't fake it
client-side.

**D10 — API tokens pointer already matches the mock exactly. Presentation
only.** `ApiTokensPointer.tsx` already is a signpost card linking to
`/docs?topic=api`, matching the mock's copy/intent precisely. Restyle the
card to the mock's rhythm (T14); no link or routing changes.

**D11 — The three new notification types don't exist anywhere, including
the backend. Do not add them.**
The mock's `NOTIFS` list carries a comment flagging `pack_approved` /
`pack_changes_requested` / `pack_rejected` as needing catalog entries. A
check against `velanto-backend` (`grep -r "pack_approved\|pack_changes_requested\|pack_rejected"`)
returns **zero matches** — these aren't just missing from the frontend's
`NOTIFICATION_TYPES`, the backend never emits them and has no type for them
either. `NOTIFICATION_TYPES` is one of this repo's MIRRORED cross-repo
constants (`cross-repo-drift.test.ts` snapshots it to a literal); adding
entries FE-only would desync that mirror and offer toggle rows for
notifications the backend can never send.
→ **Do not add them.** `NotificationsSection` restyles only the 6 existing
rows (T12). File a follow-up issue for the backend-first work (new
notification types + emission triggers on pack review actions + the
reciprocal FE/BE mirror update) — this is explicitly a separate, larger
piece of work, consistent with D7.

**D12 — Settings needs a sticky section TOC; follow the already-shipped
Legal/Rules pattern, don't invent a new one.**
The mock wants a sticky left TOC (216px, dot-marker links, collapsing to a
horizontal scroll-chip row below 940px). This repo already shipped exactly
this shape for the Rules/Legal/Updates redesign this session — `LegalScreen.tsx`
has a working sticky "on this page" nav today:
`className="flex flex-col gap-0.5 min-[900px]:sticky min-[900px]:top-[80px]"`.
No shared TOC primitive was extracted there (it's inlined per-screen).
→ Build `SettingsScreen`'s TOC the same way — inline in `SettingsScreen.tsx`
(or as a small local `SettingsToc.tsx` if that reads cleaner given Settings
has 9 sections vs Legal's fewer), same breakpoint/offset convention
(`min-[900px]:sticky min-[900px]:top-[80px]`, collapsing to a horizontal
`overflow-x-auto no-scrollbar` chip row below that). Do not extract a shared
primitive as part of this slice — if the implementer thinks a third
near-identical TOC justifies one, that is its own commit, per the Create
Pack plan's precedent for exactly this kind of call.

**D13 — Packs-tab status filter chips: client-side only, and say so.**
The mock's Packs-tab filter row (All/Live/In review/Needs edits/Drafts/
Rejected) has no backend support either — `useAuthorPacks` fetches an
author's full pack list with no `status` param. Unlike D9 (a public,
potentially-huge people-search), this is safe to build **client-side**: it's
the _owner's own_ pack list, realistically small, and the mock does the
exact same in-memory filtering. Implement the filter as a `.filter()` over
whatever `AuthorPackList` has already loaded (own profile only — a visitor
sees no filter row, matching `isOwn` in the mock); "Load more" keeps fetching
the underlying unfiltered pages as today (T4). This is IN SCOPE, unlike D9.

---

## Mock reference — extracted spec

**Profile hero** — grid `auto minmax(0,1fr) auto`, gap 20px. Avatar: square
aspect, `border-radius:26px` (not the current `rounded-full`), sized to the
hero's height (desktop; `76×76` at ≤720px). Own-profile pencil-edit badge:
`30×30` circle, `bg-#00E5FF`, bottom-right overlap, 3px page-bg ring border —
links to `/profile/edit` (D3). Username `30px/700` with the identity gradient
already in `Username.tsx`; role/trust pill beside it uses the exact
`identityPill` colours already in `user-role.ts` (mock's `ROLE_STYLE` is
byte-identical to that file's `IDENTITY_PILL`). Stats row: 4 baseline-aligned
`value + label` pairs (packs / plays / followers / following), the last two
`onClick`-navigable into the People tab (D2). Bio: `14px`, `.6` alpha,
`max-width:56ch`.

**Tabs** — underlined row, `border-bottom` per tab, a count pill
(`data-mono`) beside each label. `Packs` (own: total incl. non-approved;
visitor: approved-only count), `People` (followers + following count),
`History` (labelled "Recently played" for a visitor, "History" for the
owner).

**Packs tab** — filter chip row (own only, D13) above a
`repeat(auto-fill,minmax(262px,1fr))` grid of pack cards. Card: 16:10 cover
(`linear-gradient(150deg,{tone},#0b0c0f)`), format pill top-start, status pill
top-end (own + non-approved only — already `PackCard`'s `showStatus`), title,
review-outcome link (own + rejected/changes_requested — **cut, D7**), meta +
like-count row, then a `Play` / `Play + Edit` action row (own gets Edit —
verify whether an inline card-level Edit action already exists anywhere
before adding one; if not, this is new surface like D7 and should be cut the
same way rather than half-built).

**People tab** — segmented Followers/Following sub-tabs (styled like the
mock's `peopleTabs`, reusing the shell `FollowListModal` already has for its
own two-tab switch) + search box (**cut, D9**) + a
`repeat(auto-fill,minmax(288px,1fr))` grid of `FollowUserRow`-shaped cards
(avatar, `@handle`, MUTUAL pill when applicable, meta, Follow/Following
button) + empty state + "Show N more" (reuse `useFollowList`'s existing
`hasNextPage`/`fetchNextPage`, no new pagination logic).

**History tab** — for the owner only, a visibility toggle row ("Show my play
history publicly" — this is the **same** `showPlayHistory` preference
`PrivacySection` already manages; do not build a second control for it, wire
this one to the same `useSetPlayHistory` mutation and treat `PrivacySection`'s
row as the settings-page copy of the same switch) above a vertical list of
history rows (icon-by-kind, title, detail line, relative time, action link).
Replaces the current horizontal `PackScrollRail`.

**Profile Edit** — sticky header (Back-to-profile + "Edit profile" crumb),
single column `max-width:680px`. Avatar card (drag-drop zone, D4). Username
field (`@`-prefixed, live counter, "CHANGED" pill, D8's live validation).
Bio textarea (280 max, counter). **New**: "How it looks" live preview card —
mirrors the profile hero's identity treatment using a live draft (T10, must
reuse `Username`/`UserAvatar`/`identityKind`, not fork them — same precedent
as Create Pack's `CreatePreviewPanel`, which was new UI over existing data,
not new capability). Save (disabled until dirty+valid) + Cancel + inline
"Saved" confirmation (not a toast, stays until the next edit).

**Preferences** — sticky left TOC (D12) + right column of `#171A22 r16`
bordered cards, one per section, in this order: Language, Appearance,
Connected accounts, Privacy, Notifications, Account, Password, API tokens,
Danger zone. Page intro copy: _"Everything about your account, in one place.
Changes save as you make them — no submit button, except where a password is
required."_ — every section autosaves on change except Password and Delete
Account, which keep explicit submit buttons (already true of the current
implementation; the intro copy itself is new, T15).

Token mapping (never hardcode a hex — `.claude/docs/design-tokens.md`):

| Mock literal                                        | Token / utility                                                                                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#0F1116` page bg                                   | `bg-background`                                                                                                                                                  |
| `#171A22` card                                      | `bg-surface-card`                                                                                                                                                |
| `rgba(255,255,255,.07)`–`.09` hairline              | `border-border`                                                                                                                                                  |
| `rgba(255,255,255,.14)`–`.18` dashed / hover border | `border-white/[0.14]` / `border-white/[0.18]`                                                                                                                    |
| `#EEF1F6` / `.6` / `.45` / `.35` text               | `text-foreground` / `variant="secondary"` / `variant="tertiary"`                                                                                                 |
| `#00E5FF` / `#8CF3FF`                               | `text-acc` / `bg-acc` / `border-acc` / `text-acc-hover` (never hardcode — this repo's accent is USER-switchable, D6)                                             |
| `#FF8C8C` / `#FF5A5A`-family                        | `text-danger` / `border-danger/40`                                                                                                                               |
| radius 8–11 / 12–15 / 18–26                         | `rounded-chip`/`rounded-control` / `rounded-tile` / `rounded-card` (26px hero avatar is the one deliberate one-off — comment why)                                |
| `nicknamesweep` role gradient                       | the existing `.nickname-gradient` + per-role modifier — do **not** re-derive `ROLE_STYLE`, it is `user-role.ts`'s `IDENTITY_PILL`/`NICKNAME_CLASS` byte-for-byte |

RTL: 3 of the 8 locales are RTL — logical properties throughout
(`ms-`/`me-`, `ps-`/`pe-`, `start`/`end`). The Profile hero's pencil badge
(`right:-6px;bottom:-6px` in the mock) must become `end-[-6px] bottom-[-6px]`.

**Container widths** — none of these three screens are pack surfaces, so
`PACK_CONTAINER` does not apply (its own doc comment scopes it to
detail/edit/play/result). Keep the existing per-screen plain Tailwind
max-width convention already used here (`max-w-4xl` on `AuthorScreen`,
`max-w-2xl` on `ProfileEditForm`/`SettingsScreen` today) and size each to its
mock: Profile ≈ `max-w-[1080px]`, Profile Edit ≈ `max-w-[680px]`, Preferences
≈ a TOC (`216px` fixed) + content column (`~820px`), roughly `max-w-[1080px]`
total — pick exact values against the mock, don't invent new ones later.

---

## Task list

Each task = one commit. Tests first (TDD) in every task that names a test file.

### T1 — `AuthorProfileHeader` hero restyle

**Files:** `AuthorProfileHeader.tsx`, `AuthorProfileHeader.test.tsx` (new —
there is no test today; check for one under a different name first)

- Avatar: `26px`-radius square tile sized to the hero's row height (not
  `rounded-full`), still wrapped in `Hidden kind="avatar"` +
  `AvatarLightbox` — unchanged behaviour, restyled frame only.
- Own-profile pencil badge (D3): `30×30`, `bg-acc`, `text-[#07131a]`,
  3px-ring border in `bg-background`, positioned `absolute end-[-6px]
bottom-[-6px]`, `aria-label` = existing `editProfile` key, `<Link
href="/profile/edit">`.
- Username + role pill: swap the current bare `<Username showRole />` call's
  surrounding markup to the mock's `30px/700` sizing; the component itself
  (gradient, pill colours) is untouched (D-do-not-touch table).
- Stats row (new, replaces the current `followerCount · followingCount ·
packCount` inline text): 4 `value/label` pairs — Packs (own: `packsTotal`
  incl. non-approved; visitor: approved-only, which `packsTotal` already is
  server-side per `AuthorPackList`'s `own` split — verify, don't assume),
  Plays (**mock hardcodes "12.4k" — we have no aggregate play-count stat on
  `PublicUserProfile` today; check the type before wiring this row: if
  absent, drop the Plays stat rather than fabricate a number**), Followers,
  Following. Followers/Following buttons call the new `onSelectPeopleTab`
  prop (D2) instead of `setFollowList`.
- `isOwnProfile` branch keeps "Edit profile" (now `secondary` button
  variant, unchanged) + adds "New pack" as a primary `Link` to `/create`
  (mock shows both; today only Edit profile renders) — confirm `/create`
  is the right href (it is, per the root CLAUDE.md route map).
- Bio unchanged in content/logic, restyled to the mock's `max-w-[56ch]`
  paragraph.

New i18n: none required if the Plays stat is dropped (recommended); if a
real plays-total field turns up on `PublicUserProfile`, add
`profile.statPlays` in T15.

### T2 — `ProfileTabs`: the Packs/People/History tab shell

**Files (new):** `src/features/author/ProfileTabs.tsx`, `ProfileTabs.test.tsx`
**Files (edited):** `AuthorScreen.tsx`

Resolves D2. A client component owning `activeTab` state (`"packs" |
"people" | "history"`), rendered between `AuthorProfileHeader` and the
moderator panel. Underlined tab row per mock (`border-b-2` active,
`variant="tertiary"` inactive, count pill via `data-mono`-equivalent —
`tabular-nums`). Props thread through what `AuthorScreen` already computes
(`isOwnProfile`, `packsTotal`, follower/following counts from `profile`,
`HISTORY`'s equivalent — `RecentlyPlayedSection`'s own query, so `ProfileTabs`
doesn't need the count ahead of time, lazy-render is fine).

Accepts an optional `initialTab` + `initialPeopleSubTab` so
`AuthorProfileHeader`'s stat buttons (T1) can deep-link straight into
`people` / `followers` or `people` / `following` — pass via local state
lifted to `AuthorScreen`, not the URL (matching `FollowListModal`'s
`initialTab` precedent; a query-param version is a nicer future upgrade, not
this slice's job).

Test: renders 3 tabs with counts, switching tab swaps the visible panel,
`aria-selected`/`role="tab"` on the tab row (mirror `FollowListModal`'s
existing tablist pattern).

New i18n: none — `profile.packs`/`profile.people`/`profile.history` (or
reuse existing keys the `t(kind)` calls in `FollowListModal` already read —
check `profile` catalog for `followers`/`following` before adding new ones).

### T3 — `PeopleTab`: inline followers/following (replaces `FollowListModal`)

**Files (new):** `src/features/author/PeopleTab.tsx`, `PeopleTab.test.tsx`
**Files (deleted):** `FollowListModal.tsx`, `FollowListModal.test.tsx`
**Files (edited):** `AuthorProfileHeader.tsx` (drop the modal-open state)

Lifts `FollowListModal`'s existing sub-tab switch (`Followers`/`Following`,
`useFollowList`, `hasNextPage`/`fetchNextPage`) out of `Modal` into an inline
panel, grid `repeat(auto-fill,minmax(288px,1fr))` per the mock instead of
the modal's single column. `FollowUserRow` is reused as-is — do not fork it,
it already renders exactly what the mock's people-grid cards need (avatar,
`@handle`, follow button); only its container's layout (list row → grid
card) changes, which is a wrapper concern, not `FollowUserRow`'s.

No search box (D9, cut). Empty state and "Show N more" keep
`FollowListModal`'s existing copy/logic (`t("noFollowers")` etc.), just
restyled to the mock's dashed-empty-state look (reuse `EmptyState` if it
fits, per this repo's established empty-state primitive).

Test: renders the sub-tab switch, lists users from `useFollowList`, "Show
more" appends a page — port `FollowListModal.test.tsx`'s existing coverage
rather than starting from scratch.

New i18n: none (all strings ported from the existing `profile` catalog
entries `FollowListModal` already used).

### T4 — `AuthorPackList` restyle + status filter chips

**Files:** `AuthorPackList.tsx`, `AuthorPackList.test.tsx`

- Section heading removed (now redundant with the `ProfileTabs` "Packs" tab
  — `AuthorPackList` becomes a tab panel body, not a titled section).
- Filter chip row (D13, own profile only): `all` / per-`PACK_STATUSES` value
  pill row, `SegmentedControl`-adjacent but a multi-pill row not a 2-state
  toggle — check whether `SegmentedControl` supports >2 options before
  hand-rolling a new pill row; if it does, use it. Filtering is a plain
  `.filter()` over `packs` (the already-flattened array), state owned
  locally (`useState<PackStatus | "all">`). "Load more" is unaffected — it
  still calls the real `fetchNextPage()` against the unfiltered query, per
  D13.
- Grid restyle to the mock's `repeat(auto-fill,minmax(262px,1fr))` — verify
  against `PackCard`'s current grid usage elsewhere (`grid-cols-1
sm:grid-cols-2 lg:grid-cols-3` today) and pick whichever reads better at
  this narrower tab-panel width; they don't have to match `HomeFeed`'s grid.
  `PackCard` itself is unchanged (D7 — no review-outcome link, no inline
  Edit action added).

New i18n: filter chip labels — check `people`/`profile` catalogs for an
existing `PACK_STATUSES`-keyed label set before adding new ones (the
moderation queue almost certainly already has status labels somewhere —
reuse them, per `create-pack-redesign.md`'s D3 precedent of reusing an
existing picker rather than inventing new copy).

### T5 — `RecentlyPlayedSection` → row-list restyle + History tab wiring

**Files:** `RecentlyPlayedSection.tsx`, `RecentlyPlayedSection.test.tsx`

Swap the `PackScrollRail` horizontal-rail rendering for the mock's vertical
row list (icon-by-kind chip, title, detail line, relative time, action
link) when rendered inside the History tab. Keep the underlying
`useRecentlyPlayed` query, pagination, and the `visible`/`showEmptyState`
props exactly as-is — this is a presentation swap of the same data. The
kind→icon/detail mapping (`solo`/`scored`/`room`/`resume`) in the mock's
`glyph()`/`iconBg`/`iconFg` needs a real equivalent: check what
`useRecentlyPlayed`'s items actually carry (format, room vs solo, resume
state) before assuming all four kinds are derivable — if some aren't (e.g.
no "you scored N" data), drop that kind's decoration rather than fabricate
it, matching D7/D11's discipline elsewhere in this plan.

Own-profile visibility toggle row ("Show my play history publicly") at the
top of the History tab: **do not build a second `showPlayHistory` control**
— render it wired to the exact same `useSetPlayHistory` mutation
`PrivacySection` (T11) already uses, so the two surfaces can never
disagree. If duplicating that wiring here feels awkward, consider hoisting a
small shared `PlayHistoryToggle` component both `PrivacySection` and the
History tab render — that's a legitimate T5b sub-task, not scope creep,
since it's the same control in two places rather than two controls.

New i18n: none if the toggle is hoisted/shared; if any new history-row
copy is needed for icon kinds we can actually derive, add under `profile.*`.

### T6 — `ProfileRedirect` login-block restyle

**Files:** `ProfileRedirect.tsx`, `ProfileRedirect.test.tsx`

Small: the signed-out `/profile` visit shows a centered login prompt today
(`max-w-md`, plain `Text` + button). Bring its card/button styling in line
with the rest of this slice's token usage (it's currently correct, just
using older utility patterns) — no copy or logic change.

New i18n: none.

### T7 — `AuthorScreen` shell wiring

**Files:** `AuthorScreen.tsx`, `AuthorScreen.test.tsx`

Wire T1–T5 together: `AuthorProfileHeader` (T1) → `ProfileTabs` (T2,
containing `AuthorPackList`/`PeopleTab`/`RecentlyPlayedSection`) →
`AuthorModeratorPanel` (unchanged, still rendered above or interleave per
the mock — the mock has no moderator-panel equivalent since it's a public
mock; keep its current position, a staff-only concern out of this mock's
scope). Container width `max-w-[1080px]` (see the container-widths note),
replacing today's `max-w-4xl`. `BackButton`/`Browse` link in
`app/users/[id]/page.tsx` restyled to the mock's pill-button chrome if not
already matching (check against the Pack Detail slice's back-button
treatment first — likely already consistent, verify don't assume).

New i18n: none.

### T8 — `ProfileEditForm`: username live validation + "CHANGED" pill

**Files:** `ProfileEditForm.tsx`, `ProfileEditForm.test.tsx`

Resolves D8's UX-polish half. Add a `tried` flag (true once the username
field has been blurred/changed once) so the format error shows live rather
than only after a failed submit; a "CHANGED" pill (`rounded-pill`, accent
tint) appears beside the field once `username !== currentUsername`. The
409-taken path and the `USERNAME_PATTERN` check are unchanged — this task
only changes _when_ the client-side error renders, never adds a client-side
taken-list.

New i18n: `profile.usernameChangedPill` = "Changed" (or similar — check
existing pill copy conventions in the catalog for tone).

### T9 — `AvatarSection`: drag-and-drop zone restyle

**Files:** `AvatarSection.tsx`, `AvatarSection.test.tsx`

Resolves D4's presentation half. Replace the plain file-input button with
the mock's drag-and-drop label zone (`onDragOver`/`onDragLeave`/`onDrop`,
dashed border that solidifies to accent while dragging, copy state machine
`"Drag a photo here or click"` → `"Drop to upload"` (dragging) →
`"Replace photo"` (has an avatar)). The dropped/picked file still flows
through the exact same `handleFile` validation (type/size) into the exact
same `AvatarCropModal` (D4) — only the picker affordance changes.

New i18n: `profile.avatarDropLabel`, `profile.avatarDropActive`,
`profile.avatarReplaceLabel` (or reuse `avatarChange`/similar existing keys
where the copy already matches — check first).

### T10 — `ProfileEditPreview`: the "How it looks" live preview card

**Files (new):** `src/features/profile/ProfileEditPreview.tsx`,
`ProfileEditPreview.test.tsx`

New UI, not new capability — same precedent as Create Pack's
`CreatePreviewPanel` (a live-preview sidebar reflecting in-progress form
state, added as in-scope new surface in that slice). Renders the draft
username/bio/avatar exactly as the hero would: **reuse `Username`
(role/trusted from the already-loaded profile — those don't change in this
form) and `UserAvatar` directly**, not a parallel re-implementation of the
gradient/pill logic — this is the concrete ask behind "reuse
identityKind/nicknameClass/identityPill, not fork them" from the task brief.
Card: `rounded-card bg-surface-card border-border`, mirrors the hero's
username+pill+bio block at a smaller scale. Live-updates from
`ProfileEditForm`'s existing `draft`/`usernameDraft` state — pass them down,
no new state.

Test: renders the draft username with the correct role gradient/pill,
updates as props change, falls back to the saved value when a draft is null.

New i18n: `profile.previewHeading` = "How it looks".

### T11 — `PrivacySection` restyle + shared toggle prep for T5

**Files:** `PrivacySection.tsx`, `PrivacySection.test.tsx`

Resolves D5. Restyle the two `Card` rows to the mock's rhythm; drop the
stale `hover:translate-y-0 hover:shadow-none` overrides on both `Card`s —
`Card` is `interactive={false}` by default now (see `Card.tsx`), so these
are dead counter-classes, exactly the cleanup the Solo Play/Results plan
made in its T12 for the same reason. If T5's shared `PlayHistoryToggle` is
built, `PrivacySection`'s "Show play history" row renders it instead of its
own `SegmentedControl` call.

New i18n: none.

### T12 — `NotificationsSection` restyle (6 existing types only)

**Files:** `NotificationsSection.tsx`, `NotificationsSection.test.tsx`

Resolves D11's presentation half. Restyle the row list to the mock's
icon+hue treatment and the "{enabledCount} of {total} on" header line — using
`NOTIFICATION_TYPES` exactly as it is today (6 entries). Do **not** add
`pack_approved`/`pack_changes_requested`/`pack_rejected` (D11). Drop the
stale `hover:translate-y-0 hover:shadow-none` on every `Card` here too.

New i18n: `settings.notifEnabledCount` (ICU: "{count} of {total} on" —
mirror an existing count-noun's plural forms per this repo's established
i18n discipline, see T15).

### T13 — `AppearanceSection` → `SwatchPicker`

**Files:** `AppearanceSection.tsx`, `AppearanceSection.test.tsx`

Resolves D6's presentation half. Replace the hand-rolled swatch `<button>`
loop with `<SwatchPicker swatches={ACCENTS} value={accent}
onChange={handleSelect} getLabel={...} swatchStyle="solid" />` — same
`ACCENTS`, same `getStoredAccent`/`setStoredAccent` call inside
`handleSelect`, same live `--acc` set. Verify `SwatchPicker`'s existing
`aria-pressed`/`getLabel` contract still satisfies
`accentColorSwatch`'s current test assertions before/after the swap.

New i18n: none (copy unchanged).

### T14 — `ApiTokensPointer`, `AccountSection`, `ConnectedAccountsSection`,

`PasswordSection`, `SetPasswordSection`, `AddEmailForm`, `DangerZoneSection`
restyle pass

**Files:** all of the above + their tests

Pure restyle, no logic changes (D10, and the DO-NOT-TOUCH table). Drop
`hover:translate-y-0 hover:shadow-none` everywhere it appears in these
files (same `Card` cleanup as T11/T12). Apply the mock's card rhythm:
Account's read-only email card, Connected Accounts' provider rows (real
`OAuthProviderIcon`s, unchanged), Password's 3-field form with its existing
reveal toggles (already implemented per `PasswordField`'s
`showLabel`/`hideLabel` props — confirm, don't rebuild), Danger Zone's
red-bordered card with the two stacked rows + the existing delete-confirm
modal. `AddEmailForm` has no mock slot (the mock's Account section assumes
every account has an email) — keep it rendering exactly as today inside
`AccountSection`'s no-email branch, styled consistently with the rest of the
pass (per this plan's D4-style "keep what the mock has no slot for"
discipline, borrowed from the Create Pack plan's D4).

New i18n: none.

### T15 — `SettingsScreen` shell: sticky TOC + page intro + gates + PR

**Files:** `SettingsScreen.tsx`, `SettingsScreen.test.tsx` (new — check for
one under a different name first), `messages/{ar,bn,en,hi,ru,uk,ur,zh}.json`,
every touched `*.test.tsx`

- Page intro copy (new): `settings.intro` = "Everything about your account,
  in one place. Changes save as you make them — no submit button, except
  where a password is required."
- Sticky TOC (D12): `SECTIONS` list (Language/Appearance/Connected
  accounts/Privacy/Notifications/Account/Password/API tokens/Danger zone),
  dot-marker links scrolling to each section's `id` anchor, `min-[900px]:
sticky min-[900px]:top-[80px]`, collapsing to a horizontal `overflow-x-auto
no-scrollbar` chip row below 900px — same convention as `LegalScreen.tsx`.
  Give every section a stable `id` (`<section id="language">` etc.) for the
  anchors.
- Container: `max-w-[1080px]` two-column layout (TOC `216px` fixed + content
  flex-1), replacing today's single `max-w-2xl` column.

**i18n.** Add every new key from T1–T14 to all 8 catalogs — real
translations, not transliterated placeholders. Same two traps as both prior
2.0.0 redesign plans, worth repeating because they've burned this repo
twice already:

- **ICU plurals** (T12's enabled-count line, any new count-bearing string):
  ar needs the full `zero/one/two/few/many/other` set, ru/uk need
  `one/few/many/other` — mirror an existing count-noun in the same catalog,
  don't invent the forms (per `auth.brand.socialProof`'s fix in `386d06c`).
- **ar/ur connotation** — this slice adds no format-name copy, so this trap
  is unlikely to bite, but if any new string touches "trusted"/"moderator"/
  role language, cross-check it against `user-role.ts`'s existing
  `IDENTITY_PILL` labels rather than re-deriving a translation.
- Run the catalogs-parity check (`LOCALES` ↔ `messages/*.json` invariant in
  `src/shared/types/cross-repo-drift.test.ts`).

**Vitest.** New: `ProfileTabs.test.tsx`, `PeopleTab.test.tsx`,
`ProfileEditPreview.test.tsx`, `SettingsScreen.test.tsx` (if none exists).
Deleted: `FollowListModal.test.tsx`. Updated: `AuthorProfileHeader.test.tsx`,
`AuthorPackList.test.tsx`, `RecentlyPlayedSection.test.tsx`,
`AuthorScreen.test.tsx`, `ProfileEditForm.test.tsx`, `AvatarSection.test.tsx`,
`PrivacySection.test.tsx`, `NotificationsSection.test.tsx`,
`AppearanceSection.test.tsx`, and every other settings-section test whose
`Card` markup changed. `ImageCropModal.test.tsx`, `AvatarCropModal.test.tsx`,
`user-role.ts`'s own tests, `theme.ts`'s own tests, and the streamer-mode
context tests must **not** need edits — if one does, something in the
scope-boundary table was touched.

**Playwright.** There is **no existing `e2e/profile.spec.ts` or
`e2e/settings.spec.ts`** in this repo today (only `auth`, `home`,
`create-pack`, `edit-pack`, `play`) — unlike the Create Pack and Solo
Play/Results slices, this plan is not protecting an existing e2e contract
from breaking. Adding one is optional net-new coverage, not a gate:
worth adding a minimal `e2e/profile.spec.ts` (visit a profile, switch tabs,
open Profile Edit, change bio, save) if time allows, but do not block the
PR on it.

**Gates** (no CI runs on `release/*` — everything is local):
`npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run test:e2e` ·
production `next build` · catalogs parity. Then
`pr-review-toolkit:code-reviewer`, plus `ui-guardian` for the
design-token/a11y pass. PR into `release/2.0.0` — self-merge is fine per the
release-branch rule; **never** open this against `develop`/`main` without
asking.

---

## Deferred / adapted (state these explicitly in the PR body)

- The mock's own inline "Edit profile" modal on the Profile page — a demo
  artifact of the mock being self-contained; the real `/profile/edit` route
  stays the one edit surface (D3).
- The mock's rejected/changes-requested "review outcome" link and its
  target screen (`Pack Review Outcome.dc.html`) — genuine missing feature
  (`rejectionReason` is wired on the type but rendered nowhere), not this
  slice's job (D7).
- The mock's People-tab search box — no backend `q` param on the
  followers/following endpoints to back it (D9).
- The mock's 3 new notification types (`pack_approved`/
  `pack_changes_requested`/`pack_rejected`) — don't exist in the backend
  either; needs backend-first work (D11).
- The mock's Packs-tab card-level Edit button — cut alongside D7 unless an
  existing inline-edit affordance turns up during T4 that this plan missed.
- The mock's hardcoded `TAKEN` username stand-in and its `pct`-style demo
  numbers — never real data sources; the real 409/backend values are kept
  throughout (D8, and by extension nothing in this plan resurrects a
  `count / totalPlays`-style fabricated stat, consistent with the Solo
  Play/Results plan's D5).
- A shared TOC primitive — the Legal/Rules precedent didn't extract one;
  this plan doesn't either, on the same reasoning (D12).
