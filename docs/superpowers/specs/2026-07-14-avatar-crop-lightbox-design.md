# Avatar Cropper + View-Others Lightbox — Design Spec

**Status:** approved · **Date:** 2026-07-14 · **Repo:** velanto-frontend · **Issue:** #155

## Goal

Enhance the already-shipped avatar feature (upload/replace/delete — FE #153, BE #119) with two **frontend-only** additions:

1. **Crop-on-upload** — a client-side cropper so the user chooses the square region before upload, instead of a rectangular photo being letterboxed by the backend's fit-inside 256² resize.
2. **View-others lightbox** — clicking an avatar that has an image opens an enlarged view, on profile pages only.

## Non-goals (already done or out of scope)

- **Edit-with-delete-previous** and **delete-avatar** already work: `setAvatar` marks the previous key `pendingDelete` and `removeAvatar` clears + marks the old one; the `MediaSweeper` deletes them from S3. No change.
- Cropping cover/item images — out of scope (avatars only).
- No backend change of any kind.

## Why frontend-only

- Cropping produces a square image `File` that goes through the **existing** `uploadMedia(file, "avatar")` → `usersClient.setAvatar(key)` flow (`useUpdateAvatar`). The backend still re-encodes to 256² WebP — cropping just controls _which_ square it keeps.
- The lightbox reads the `avatarKey` that `getPublicProfile`/`getMe` already return, resolved with the existing `mediaUrl`.

## Architecture

### A. Crop-on-upload

**New dep:** `react-easy-crop` (~15 KB; built-in `cropShape="round"`, drag-pan + zoom, touch-friendly).

**New `cropImage(file: File, area: Area): Promise<File>`** (`src/features/profile/crop-image.ts`)

- `area` = react-easy-crop's `croppedAreaPixels` (`{ x, y, width, height }`).
- Draws that region onto a canvas sized to the crop (capped to **512×512** so output stays small), exports via `canvas.toBlob(..., "image/webp", 0.9)`, wraps the blob in a `File` named `avatar.webp`.
- The output is always well under the 1 MB cap; the backend re-encodes to 256² regardless.
- Pure-ish (takes a File, returns a File) so it's unit-testable with a mocked canvas.

**New `AvatarCropModal`** (`src/features/profile/AvatarCropModal.tsx`)

- Props: `{ file: File; open: boolean; onCancel: () => void; onCropped: (cropped: File) => void }`.
- Renders `<Modal>` (reused primitive, widened via `className`) titled "Crop your avatar", containing:
  - a `<Cropper>` from react-easy-crop (`aspect={1}`, `cropShape="round"`, `showGrid={false}`), with `image` = an object URL of `file`.
  - a zoom `<input type="range">` (min 1, max 3, step 0.1) labelled for a11y.
  - **Cancel** and **Save** buttons; Save runs `cropImage(file, croppedAreaPixels)` then `onCropped(result)`.
- Manages `crop`/`zoom`/`croppedAreaPixels` local state; revokes the object URL on unmount/close.

**`AvatarSection` change** (`src/features/profile/AvatarSection.tsx`)

- Picking a file no longer uploads immediately. After the existing client validation (image type + ≤1 MB on the _original_ pick), it stores the file in state and opens `AvatarCropModal`.
- `onCropped(cropped)` runs the existing `useUpdateAvatar.mutate(cropped, { onSuccess → setAvatarKey })`.
- `onCancel` clears the pending file and the input.
- Keeps the current remove button, error surface, and busy/disabled behavior.

### B. View-others lightbox

**New `AvatarLightbox`** (`src/shared/components/AvatarLightbox.tsx`)

- A thin wrapper that makes a `UserAvatar` **openable**: renders the avatar inside a `<button>` (only when `avatarKey` is set), and on click opens a `<Modal>` showing the enlarged image (`<img src={mediaUrl(avatarKey)}>`, max ~360 px, rounded).
- When `avatarKey` is null, renders a plain non-interactive `UserAvatar` (initials — nothing to enlarge).
- Props: `{ username: string; avatarKey: string | null; className?: string }` (mirrors `UserAvatar` so it's a drop-in at call sites).

**Wiring (profile pages only):**

- `src/features/author/AuthorProfileHeader.tsx` — other users' `/users/[id]` header: swap its `UserAvatar` for `AvatarLightbox`.
- `src/features/profile/ProfileScreen.tsx` — own `/profile` view: same swap.
- `AvatarSection` (edit page) is left as-is — it's the management surface, not a view surface.

### i18n

New keys in the `profile` (and if needed `common`) namespace across **all 11 locale catalogs** (`messages/*.json`) — `cross-repo-drift`/`catalogs` tests forbid untranslated keys. Keys: crop modal title, zoom label, Save, Cancel, and the lightbox close/alt label. Non-English values machine-translated (consistent with existing catalog policy; flagged for later human review).

## Testing (TDD, Vitest + RTL)

- `crop-image.test.ts` — `cropImage` returns a `File`, caps dimensions at 512, names it `avatar.webp` (canvas mocked).
- `AvatarCropModal.test.tsx` — opens with the file, **Save** calls `onCropped` with a cropped File, **Cancel** calls `onCancel` and doesn't crop.
- `AvatarLightbox.test.tsx` — clickable + opens modal when `avatarKey` set; plain, non-interactive when null; closes on backdrop/Escape (via Modal).
- `AvatarSection.test.tsx` — update: picking a file opens the crop modal (not an immediate upload); completing the crop fires `useUpdateAvatar`. Keep the existing validation + remove tests.
- No e2e spec exists for avatars; none added (kept lean).

## Risks / notes

- **jsdom canvas**: `toBlob`/`getContext` aren't implemented in jsdom — the `cropImage` test mocks the canvas (or asserts the crop-geometry math), and `AvatarCropModal` interactions mock `cropImage` itself so the modal test doesn't touch a real canvas.
- **react-easy-crop in tests**: mock the `Cropper` default export to a stub that immediately reports a `croppedAreaPixels`, so the modal test is deterministic and fast.
- Bundle: react-easy-crop is only imported by `AvatarCropModal` (a client component on the profile-edit route) — no home-feed weight.

## Workflow

Issue #155 → this branch → TDD task-by-task → `code-reviewer` + `ui-guardian` → PR to `develop` → CI green → squash-merge.
