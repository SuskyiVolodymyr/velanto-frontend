# Notifications Frontend — Design Spec

**Issue:** frontend#45 ("Add notification system"), backend counterpart already shipped (velanto-backend#59, PR #68): `Notification`/`NotificationPreference` models, `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `GET`/`PATCH /notifications/preferences`, four event types (`new_follower`, `new_pack_from_followed`, `new_comment`, `pack_deleted_warning`).

## Scope

Per the issue: a bell icon + drawer in the header (poll-based, no websockets), and per-type on/off preferences in Settings. Ground truth for the bell/drawer UI comes from `Vilante Home.dc.html`'s `NOTIFICATIONS DRAWER` section — real mock markup exists (unread dot on the bell, slide-in `<aside>` from the right, backdrop click-to-close, list of notification rows). The mock's own `NOTIFICATIONS` array (free-text strings) is superseded by the real backend's four typed events with structured payloads.

## Data model (local, independent — this repo doesn't import backend types)

`src/shared/types/notification.ts`:
```ts
export const NOTIFICATION_TYPES = [
  "new_follower",
  "new_pack_from_followed",
  "new_comment",
  "pack_deleted_warning",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  type: NotificationType;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
}

export type NotificationPreferences = Record<NotificationType, boolean>;
```

Per-type payload shapes (cast at render time in the message-formatting helper, not enforced by a discriminated union — matches the backend's own "polymorphic JSON" precedent):
- `new_follower`: `{ followerId, followerUsername }`
- `new_pack_from_followed`: `{ packId, packTitle, authorUsername }`
- `new_comment`: `{ packId, packTitle, commentId, commenterUsername }`
- `pack_deleted_warning`: `{ packTitle }`

## API client

`src/shared/lib/notifications-client.ts`, mirroring `packs-client.ts`'s shape (own tiny `page`/`limit` query builder, not importing the pack-specific one):
```ts
export const notificationsClient = {
  list: (filters: { page?: number; limit?: number } = {}) => apiClient.get<NotificationList>(`/notifications${buildListQuery(filters)}`),
  unreadCount: () => apiClient.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) => apiClient.post<Notification>(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post<{ updated: number }>("/notifications/read-all"),
  getPreferences: () => apiClient.get<NotificationPreferences>("/notifications/preferences"),
  setPreferences: (updates: Partial<NotificationPreferences>) => apiClient.patch<NotificationPreferences>("/notifications/preferences", updates),
};
```

## Message rendering

`src/shared/lib/notification-display.ts` — one function mapping a `Notification` to `{ message: string; href: string | null }`:
- `new_follower` → `"{followerUsername} started following you"`, href `/users/{followerId}` (the Author route, confirmed to exist at `app/users/[id]/page.tsx`).
- `new_pack_from_followed` → `"{authorUsername} published a new pack: {packTitle}"`, href `/packs/{packId}`.
- `new_comment` → `"{commenterUsername} commented on your pack {packTitle}"`, href `/packs/{packId}`.
- `pack_deleted_warning` → `"Your pack \"{packTitle}\" was removed by a moderator"`, href `null`.

Uses a small inline relative-time formatter for `createdAt` (`"2h ago"`, `"3d ago"`, etc. — no existing helper in this repo, add `src/shared/lib/relative-time.ts`, simple threshold ladder, no library).

## Bell + drawer (`AppHeader.tsx` + new `NotificationsBell.tsx`)

- Bell button rendered in `AppHeader.tsx` next to `UserMenu`, only when `status === "authenticated"`.
- Polls `notificationsClient.unreadCount()` on mount, every 30s (`setInterval`), and on the browser `focus` event — all three matching the issue's explicit "poll on an interval and on focus" requirement. Cleared/stopped on unmount and when unauthenticated.
- Unread dot shown when `count > 0`, matching the mock's `hasUnread` visual.
- Click toggles a drawer (`NotificationsBell` owns `open` state internally, matching `UserMenu.tsx`'s existing outside-click/Escape-close pattern exactly — same `containerRef`/`triggerRef`/`mousedown`+`keydown` listener idiom, not a new pattern).
- On open: fetch `notificationsClient.list({ page: 1, limit: 20 })` first (so the initial render still shows each row's real `readAt` state), render the list, **then** fire `notificationsClient.markAllRead()` (fire-and-forget) so the bell's unread dot clears — mirrors the mock's `onToggleNotifs` immediately marking everything seen, but preserves one render's worth of accurate per-row unread state instead of the mock's cruder always-seen-instantly behavior.
- List rows: message (via `notification-display.ts`) + relative time + optional link (row is a `<Link>` if `href` is non-null, closing the drawer on click; otherwise a plain `<div>`).
- "Load more" pagination — same `page`/dedupe-by-id pattern as `ModerationQueueScreen`/`SupportScreen`.
- Empty state: `"No notifications yet."` Error state: `"Couldn't load notifications."` (matches existing inline-`Text`-error convention, no toast).
- Backdrop: fixed inset overlay, click closes drawer (matches the mock's backdrop click-to-close).

## Settings preferences (`src/features/settings/NotificationsSection.tsx`)

New section added to `SettingsScreen.tsx` after `AccountSection`, following `AppearanceSection`'s existing card/section layout convention (read it first for exact structure).

- On mount, fetches `notificationsClient.getPreferences()`.
- Renders four toggle rows (one per `NOTIFICATION_TYPES`), human labels: "New follower", "New pack from someone you follow", "New comment on your pack", "Pack removed by a moderator".
- Each toggle is independent: flipping one calls `setPreferences({ [type]: newValue })` immediately (non-optimistic — wait for the response before flipping the visible toggle state, matching `ModerationQueueScreen`'s established non-optimistic-update convention), with a per-row busy/error state (`Record<NotificationType, boolean>` for busy, `Record<NotificationType, string>` for error) so one toggle's in-flight/error state never blocks another's — same idiom as `ModerationQueueScreen`'s per-row state.
- Loading/error states for the initial fetch match `AccountSection`'s existing pattern (read it first).

## Testing

- `notifications-client.test.ts`: one test per method (matching `packs-client.test.ts`'s conventions).
- `notification-display.test.ts`: one test per `NotificationType`, plus the relative-time formatter's threshold boundaries (just now / minutes / hours / days).
- `NotificationsBell.test.tsx`: renders nothing when unauthenticated; shows/hides the unread dot based on polled count; opens/closes on click, outside-click, and Escape; fetches and renders the list on open; marks-all-read after the list loads; empty state; error state; "Load more" pagination; polling interval fires `unreadCount` again (use fake timers).
- `NotificationsSection.test.tsx`: initial fetch renders all four toggles in their fetched state; toggling one calls `setPreferences` with only that key; a failed toggle reverts to the prior state and shows a per-row error, without affecting the other three toggles.
- Manual browser verification: trigger each of the four backend events for real (follow a user, get a pack approved, comment on someone else's pack, have a moderator delete a pack) and confirm the bell/drawer/preferences all reflect them correctly against the live backend.

## Out of scope

- No websockets/push — polling only, per the issue's explicit constraint.
- No weekly digest (dropped backend-side already).
