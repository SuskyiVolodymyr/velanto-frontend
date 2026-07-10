# Settings screen — design

## Goal

Build the Settings screen (velanto-frontend#28), scoped down from the full `Vilante Settings.dc.html` mock through explicit user decisions (2026-07-07):

- **Language** — dropped entirely, tracked as its own future feature: [velanto-frontend#44](https://github.com/SuskyiVolodymyr/velanto-frontend/issues/44).
- **Notifications** — dropped entirely, tracked as its own future feature: [velanto-frontend#45](https://github.com/SuskyiVolodymyr/velanto-frontend/issues/45).
- **Staff role demo switcher** — not built. It was only useful while designing the mock; nothing in the shipped app currently gates any UI by role (Support/Admin screens don't exist), so it wouldn't preview anything real.
- **Delete account** — omitted entirely from this pass. Genuinely irreversible and destructive; not built without its own dedicated scoping.
- **Edit profile link** — omitted. Profile Edit (velanto-frontend#26) doesn't exist yet; linking to a route that isn't built would be a dead link.

What ships in this pass: **Appearance** (accent color picker) and **Account** (read-only info), per-section auth gating rather than a route-level gate.

## Route & access

`app/settings/page.tsx` is a **public route** — no login redirect, unlike `/create`/`/play`. Appearance works identically for anonymous and logged-in visitors (it's a pure client-side preference with no server dependency). Account is auth-gated at the section level, not the route level — same pattern already established in `CommentSection.tsx` (`useAuth()`'s `status` field drives which UI renders, not a page-level guard).

## Appearance section

Four accent swatches, matching the mock's palette: `#00e5ff` (default), `#7c8cff`, `#39d98a`, `#f5a623`. `--acc` is already a themeable CSS custom property (`app/globals.css:18`, consumed via the `acc` Tailwind color everywhere else in the app) — no new theming mechanism needed, just a way to override it per-visitor and persist that choice.

- New `src/shared/lib/theme.ts`: `getStoredAccent(): string | null` (reads `localStorage["velanto:accent"]`), `setStoredAccent(color: string): void` (writes it and calls `document.documentElement.style.setProperty("--acc", color)`).
- New `src/shared/components/ThemeInitializer.tsx`: a small `"use client"` component with no rendered output, mounted once in `app/layout.tsx` alongside `AuthProvider`. On mount, reads the stored accent (if any) and applies it via `setProperty` — so the choice persists across page loads and routes, not just while on `/settings`. If nothing is stored, `--acc` keeps its CSS-default value (`#00e5ff`) — no work needed for the unset case.
- New `src/features/settings/AppearanceSection.tsx`: renders the 4 swatches (active one gets a ring/border, matching the mock's `active ? '#fff' border : rgba(...)'`), clicking a swatch calls `setStoredAccent(color)` and updates local `useState` so the active-swatch highlight re-renders immediately.

This section requires no auth — swatches are always interactive.

## Account section

`src/features/settings/AccountSection.tsx`: consumes `useAuth()`.

- `status === "authenticated"`: shows `user.email` and a static "Signed in via email" line (this is real — the backend has no OAuth, so every account genuinely is email/password, unlike the mock's `{{ userProvider }}` which implied multiple providers might exist).
- `status === "unauthenticated"`: shows "Log in to view account settings." with a `Link` to `/auth`, same phrasing/pattern as `CommentSection`'s "Log in to leave a comment."
- `status === "loading"`: renders nothing (matches `CommentSection`'s existing convention of not flashing either state while auth is still resolving).

No Edit Profile link, no Delete account, no provider-switching — this section is display-only.

## Composition

`src/features/settings/SettingsScreen.tsx`: a `"use client"` component (needs `useAuth()` for the Account section) that renders a page heading ("Preferences", matching the mock) followed by `<AppearanceSection />` and `<AccountSection />`. `app/settings/page.tsx` is a thin Server Component wrapper (`export const metadata = { title: "Settings" }; export default function SettingsPage() { return <SettingsScreen />; }`), matching the `Docs` screen's routing pattern exactly (`app/docs/page.tsx`).

## Testing

- `theme.test.ts`: `setStoredAccent` writes to localStorage and calls `document.documentElement.style.setProperty`; `getStoredAccent` reads back what was written; returns `null` when nothing is stored.
- `AppearanceSection.test.tsx`: renders 4 swatches; clicking one calls `setStoredAccent` with the right color; the clicked swatch becomes visually active (border/ring class present).
- `AccountSection.test.tsx`: shows email + "Signed in via email" when authenticated (wrap in real `AuthProvider`, mock `authClient.refresh` per the established `CommentSection.test.tsx` pattern); shows the log-in prompt when unauthenticated; renders nothing while loading.
- Manual browser verification: visit `/settings` logged out (Appearance works, Account shows log-in prompt), pick a swatch, reload, confirm the accent persisted; log in, confirm Account now shows the real email.

## Self-review

- No placeholders/TBDs.
- Every dropped mock section has an explicit reason and, where applicable, a tracking issue — nothing was silently omitted.
- `ThemeInitializer` is the only genuinely new architectural piece; everything else follows an existing, already-reviewed pattern (`CommentSection`'s per-section auth gating, `Docs`'s routing shape).
- Scope is tight enough for a single implementation plan — no decomposition needed.
