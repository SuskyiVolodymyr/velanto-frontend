# YouTube Embedded Player — Design Spec

**Issue:** frontend#57 ("YouTube item type: real embedded player with validation and hover controls"). Currently a `youtube`-type item just renders a static `<Badge>YouTube</Badge>` + title during play (`PlayScreen.tsx`, `HeadToHeadRound.tsx`, `VersusRound.tsx`) — no thumbnail, no video, no player at all.

## Scope

Per the issue, three parts:

1. Validate a pasted YouTube URL is a real, existing video at Create-time (oEmbed, no API key).
2. Replace the static badge with a real embedded YouTube iframe player (native controls) everywhere an item can be watched during play — all three surfaces, since choosing a pick requires being able to watch every candidate first.
3. Hover-to-play/pause.

Ground truth for the hover/selection interaction pattern comes from `Vilante Play.dc.html`, which already has an unused "video" item-kind mock: a hover-preview media area (`onMouseEnter`/`onMouseLeave` on a container, `pointer-events:none` on the video/overlay so hover text and the play icon don't intercept clicks) with a **separate** checkbox+title selector bar underneath (`onClick={{ c.onToggle }}`) as the actual pick target. This repo never shipped that mock verbatim (it used a local looped `<video>` placeholder, not YouTube), but the selection-vs-media separation is the established design language and this feature adopts it for real YouTube playback.

## Data model

No changes to `Item`/`ItemType` (`src/shared/types/pack.ts`) — `youtube` already exists, `value` already holds the raw pasted URL.

New shared helper, `src/shared/lib/youtube.ts`:

```ts
const VIDEO_ID_RE = /(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/;

export function extractYouTubeId(url: string): string | null {
  const match = url.match(VIDEO_ID_RE);
  return match ? match[1] : null;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
```

(Regex matches the one already used in the `Vilante Create.dc.html` mock's `ytId()`.)

## Create-time validation (oEmbed)

New `src/shared/lib/youtube-oembed.ts`:

```ts
export interface OEmbedResult {
  title: string;
}

export async function fetchYouTubeOEmbed(
  url: string,
): Promise<OEmbedResult | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { title: typeof data.title === "string" ? data.title : "" };
  } catch {
    return null;
  }
}
```

`null` covers both network failure and a real-but-invalid/private/deleted video (oEmbed 404s in that case) — both are the same "can't add this" outcome for the UI.

`CategoryEditor.tsx` and `GroupEditor.tsx`'s `addItem()` flow (currently synchronous) becomes async for the `youtube` branch only:

- On "Add" (or Enter) with `draftType === "youtube"`: first run `extractYouTubeId(draftValue)` — if it doesn't even look like a YouTube URL, show an inline error immediately without a network call.
- If it looks valid, disable the Add button + show a small "Checking…" state, call `fetchYouTubeOEmbed`.
- On `null`: inline error ("Couldn't find that video — check the link.") and don't add.
- On success: add the item as today, except if `draftTitle` is blank, default to the oEmbed result's `title` instead of the current hardcoded `"Untitled"` — free improvement since we already fetched it.
- The `text` branch is untouched (still synchronous, no validation).

This duplicates across `CategoryEditor.tsx` and `GroupEditor.tsx` exactly like the existing `addItem`/`removeItem` logic already does (pre-existing duplication in this codebase, not introduced by this feature — not in scope to dedupe here).

## IFrame Player API loader

New `src/shared/lib/youtube-iframe-api.ts` — loads `https://www.youtube.com/iframe_api` once globally and resolves when `window.YT.Player` is ready, memoized so every card doesn't re-inject the script:

```ts
let apiPromise: Promise<typeof YT> | null = null;

export function loadYouTubeIframeApi(): Promise<typeof YT> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}
```

A minimal global type declaration (`window.YT`, `window.onYouTubeIframeAPIReady`) is added alongside it since `@types/youtube` isn't installed and pulling in a dependency for a handful of fields isn't worth it — declare only what's used (`YT.Player` constructor, `playVideo`/`pauseVideo`/`destroy` methods).

## `YouTubeCard` component

New `src/shared/components/YouTubeCard.tsx` — the one place hover/player logic lives, used by all three play surfaces:

```tsx
interface YouTubeCardProps {
  videoId: string;
  className?: string;
}

export function YouTubeCard({ videoId, className }: YouTubeCardProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!hovered || playerRef.current) return;
    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new YT.Player(mountRef.current, {
        videoId,
        playerVars: { autoplay: 1 },
        events: { onReady: (e) => e.target.playVideo() },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hovered, videoId]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (hovered) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [hovered]);

  useEffect(() => () => playerRef.current?.destroy(), []);

  return (
    <div
      className={cn("relative h-[150px] bg-black", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!playerRef.current && (
        <img
          src={youtubeThumbnailUrl(videoId)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div ref={mountRef} className="absolute inset-0" />
      {!hovered && <PlayIconOverlay />}
      <Badge className="absolute left-2 top-2">YouTube</Badge>
    </div>
  );
}
```

- Before first hover: thumbnail image only (cheap — no iframe, no script load), matching the mock's lazy "hover to preview" intent and keeping `VersusRound`'s denser lists light until actually hovered.
- First hover: kicks off the API load + player construction (`autoplay: 1` so it starts playing the moment it's ready, since the user is already mid-hover by the time it loads).
- Subsequent hover/leave on an already-constructed player: `playVideo()`/`pauseVideo()` directly, no reload — instant resume.
- Not muted — per explicit product decision, a silent preview defeats the purpose. Accepted edge case: a small minority of browsers may block unmuted autoplay on the very first hover of a session before any other click has happened on the page; not worked around.
- Native YouTube controls (fullscreen, scrub, manual pause) remain fully usable — nothing here disables pointer events on the mounted player.
- Cleanup: `destroy()` on unmount (round change / component unmount) to avoid leaking players as rounds advance.

## Wiring into the three play surfaces

All three currently render their card as a single `<button onClick={...}>` wrapping the whole card (badge + title). A real `<iframe>`-based player can't be nested inside a `<button>` (invalid HTML, and the button would swallow every click meant for the player), so each surface's card changes from "whole card is the button" to "card is a `<div>`, with a separate, explicit selector element for the pick action" — matching the mock's checkbox-bar-under-the-media pattern.

**`PlayScreen.tsx`** (non-versus branch, `candidates.slice(0, revealedCount).map(...)`): card becomes a `<div>` containing `YouTubeCard` (when `item.type === "youtube"`) or the existing plain-text media block (when not), followed by a selector row (checkbox-style, click toggles `selectedId`) — same visual selected/unselected states as today, just moved to its own row instead of the whole card being the click target for every item type. Non-video items keep today's whole-row-is-clickable behavior for simplicity (only video items need the split).

**`HeadToHeadRound.tsx`**: `HeadToHeadCard` becomes a `<div>` with the same split — `YouTubeCard` (or plain text block) on top, an explicit "Pick this" row/element beneath it calling `onPick`.

**`VersusRound.tsx`**: no change to the _selection_ unit — the whole side is still the pickable thing, not individual items, so `SideCard` stays as-is except for one required fix: it's currently a `<button>` wrapping the item list, which has the same invalid-nesting problem once one of those items is a real iframe. `SideCard`'s outer element changes from `<button>` to `<div role="button" tabIndex={0} onClick={onSelect} onKeyDown={...}>` (Enter/Space trigger select, matching native button keyboard semantics) so a `YouTubeCard` can be nested inside one of its items without being swallowed or invalid.

All three use `extractYouTubeId(item.value)` to get the video ID for `YouTubeCard`; if extraction somehow fails for a legacy/malformed stored item (shouldn't happen post-validation, but defensively), fall back to today's plain `<Badge>YouTube</Badge>` treatment rather than rendering a broken player.

## Testing

- `youtube.test.ts`: `extractYouTubeId` against `youtu.be/`, `?v=`, `/embed/`, `/shorts/` forms and a non-matching string; `youtubeThumbnailUrl` output shape.
- `youtube-oembed.test.ts`: success (mocked `fetch` resolving 200 with a title), not-found (404), network failure (`fetch` rejects) — all three return the documented shape (`OEmbedResult | null`).
- `youtube-iframe-api.test.ts`: script is only injected once across repeated calls (mock `document.createElement`/`window.YT`).
- `YouTubeCard.test.tsx`: renders the thumbnail before hover; on hover, waits for the mocked API loader and constructs a player with the right `videoId`; hovering an already-constructed player calls `playVideo()` directly (no second API load); leaving calls `pauseVideo()`; unmount calls `destroy()`.
- `CategoryEditor.test.tsx` / `GroupEditor.test.tsx`: adding a `youtube` item — Add is disabled during validation, a successful oEmbed result adds the item (with title fallback to the oEmbed title when left blank), a failed/`null` result shows an inline error and does not add; a non-YouTube-shaped URL is rejected without a network call (mock `fetch` not called).
- `PlayScreen.test.tsx` / `HeadToHeadRound.test.tsx` / `VersusRound.test.tsx`: existing selection tests updated for the new selector-row click target instead of whole-card click; a new test per file confirming a `youtube`-type item renders `YouTubeCard` instead of the badge.
- Manual browser verification: paste a real YouTube link at Create-time (confirm validation + title autofill), paste an invalid/garbage link (confirm rejection), then play through a pack containing a YouTube item on all three formats (save_one/sacrifice_one, 1v1, nxn) and confirm hover starts playback with sound, leaving pauses it, native controls work, and picking still works via the new selector element.

## Risks (flagged, not blocking)

- **oEmbed CORS**: assumed to work from a direct browser `fetch` (public, keyless, widely used this way) — confirmed during manual verification, not before.
- **Cross-iframe `mouseleave`**: entering/leaving a cross-origin iframe has known cross-browser quirks in some setups (occasional spurious leave/no-leave). Verified manually in the browser preview; no speculative workaround added unless it actually misbehaves.
- **Unmuted autoplay on first hover**: browsers may block sound before any other page click has happened this session — accepted, per explicit product decision (a silent preview was rejected as pointless).

## Out of scope

- No thumbnail/preview treatment at Create-time (`CategoryEditor`/`GroupEditor`) beyond validation — the issue only asks for play-time playback, not an editor-time player.
- No dedup of `CategoryEditor.tsx`/`GroupEditor.tsx`'s pre-existing duplicated `addItem` logic — pre-existing, not introduced here.
- No `@types/youtube` dependency — minimal hand-written ambient types for the handful of IFrame API members actually used.
