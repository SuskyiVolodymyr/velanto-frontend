# YouTube Embedded Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static "YouTube" badge shown for `youtube`-type items with a real, hover-to-play YouTube embed everywhere items are played (PlayScreen, HeadToHeadRound, VersusRound), and validate pasted YouTube links are real videos at Create-time.

**Architecture:** Three small, independent `shared/lib` helpers (video-ID/thumbnail parsing, oEmbed validation, IFrame API loader) feed one shared `YouTubeCard` component that owns all hover/player logic. The three play surfaces each get a small conditional branch that renders `YouTubeCard` instead of the current badge when an item is a youtube type with an extractable ID, falling back to the existing badge otherwise. `CategoryEditor`/`GroupEditor` get an async oEmbed check inserted into their existing `addItem` flow.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Vitest + React Testing Library, YouTube oEmbed endpoint + IFrame Player API (no API key, no new npm dependency).

---

### Task 1: Video ID + thumbnail helper

**Files:**

- Create: `src/shared/lib/youtube.ts`
- Test: `src/shared/lib/youtube.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/youtube.test.ts
import { describe, expect, it } from "vitest";
import { extractYouTubeId, youtubeThumbnailUrl } from "./youtube";

describe("extractYouTubeId", () => {
  it("extracts the id from a youtu.be short link", () => {
    expect(extractYouTubeId("https://youtu.be/KsF_hdjWJjo")).toBe(
      "KsF_hdjWJjo",
    );
  });

  it("extracts the id from a watch?v= link", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/watch?v=KsF_hdjWJjo"),
    ).toBe("KsF_hdjWJjo");
  });

  it("extracts the id from an /embed/ link", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/KsF_hdjWJjo")).toBe(
      "KsF_hdjWJjo",
    );
  });

  it("extracts the id from a /shorts/ link", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/KsF_hdjWJjo")).toBe(
      "KsF_hdjWJjo",
    );
  });

  it("returns null for a non-YouTube URL", () => {
    expect(extractYouTubeId("https://example.com/video")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractYouTubeId("")).toBeNull();
  });
});

describe("youtubeThumbnailUrl", () => {
  it("builds the mqdefault thumbnail URL for a video id", () => {
    expect(youtubeThumbnailUrl("KsF_hdjWJjo")).toBe(
      "https://img.youtube.com/vi/KsF_hdjWJjo/mqdefault.jpg",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/shared/lib/youtube.test.ts`
Expected: FAIL — `Cannot find module './youtube'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/lib/youtube.ts
const VIDEO_ID_RE = /(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/;

export function extractYouTubeId(url: string): string | null {
  const match = url.match(VIDEO_ID_RE);
  return match ? match[1] : null;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/shared/lib/youtube.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/youtube.ts src/shared/lib/youtube.test.ts
git commit -m "feat: add YouTube video id and thumbnail URL helpers"
```

---

### Task 2: oEmbed validation client

**Files:**

- Create: `src/shared/lib/youtube-oembed.ts`
- Test: `src/shared/lib/youtube-oembed.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/youtube-oembed.test.ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchYouTubeOEmbed } from "./youtube-oembed";

describe("fetchYouTubeOEmbed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the video title on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ title: "Guren no Yumiya" }),
      }),
    );

    const result = await fetchYouTubeOEmbed("https://youtu.be/KsF_hdjWJjo");

    expect(result).toEqual({ title: "Guren no Yumiya" });
  });

  it("returns null when the video doesn't exist (oEmbed 404s)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const result = await fetchYouTubeOEmbed("https://youtu.be/doesnotexist");

    expect(result).toBeNull();
  });

  it("returns null when the network request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );

    const result = await fetchYouTubeOEmbed("https://youtu.be/KsF_hdjWJjo");

    expect(result).toBeNull();
  });

  it("requests the oEmbed endpoint with the URL-encoded video URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: "x" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchYouTubeOEmbed("https://youtu.be/KsF_hdjWJjo");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.youtube.com/oembed?url=https%3A%2F%2Fyoutu.be%2FKsF_hdjWJjo&format=json",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/shared/lib/youtube-oembed.test.ts`
Expected: FAIL — `Cannot find module './youtube-oembed'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/lib/youtube-oembed.ts
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/shared/lib/youtube-oembed.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/youtube-oembed.ts src/shared/lib/youtube-oembed.test.ts
git commit -m "feat: add YouTube oEmbed validation client"
```

---

### Task 3: IFrame Player API loader

**Files:**

- Create: `src/shared/lib/youtube-iframe-api.ts`
- Test: `src/shared/lib/youtube-iframe-api.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/youtube-iframe-api.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  loadYouTubeIframeApi,
  resetYouTubeIframeApiForTests,
} from "./youtube-iframe-api";

describe("loadYouTubeIframeApi", () => {
  beforeEach(() => {
    resetYouTubeIframeApiForTests();
    delete window.YT;
    delete window.onYouTubeIframeAPIReady;
    document.head.innerHTML = "";
  });

  it("injects the iframe_api script exactly once across repeated calls", () => {
    loadYouTubeIframeApi();
    loadYouTubeIframeApi();
    loadYouTubeIframeApi();

    const scripts = document.head.querySelectorAll(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    expect(scripts).toHaveLength(1);
  });

  it("resolves with window.YT once onYouTubeIframeAPIReady fires", async () => {
    const promise = loadYouTubeIframeApi();
    const fakeYT = { Player: vi.fn() } as unknown as Window["YT"];
    window.YT = fakeYT;
    window.onYouTubeIframeAPIReady!();

    await expect(promise).resolves.toBe(fakeYT);
  });

  it("resolves immediately if window.YT.Player already exists", async () => {
    const fakeYT = { Player: vi.fn() } as unknown as Window["YT"];
    window.YT = fakeYT;

    await expect(loadYouTubeIframeApi()).resolves.toBe(fakeYT);
  });

  it("preserves and calls a pre-existing onYouTubeIframeAPIReady callback", () => {
    const previous = vi.fn();
    window.onYouTubeIframeAPIReady = previous;

    loadYouTubeIframeApi();
    window.YT = { Player: vi.fn() } as unknown as Window["YT"];
    window.onYouTubeIframeAPIReady!();

    expect(previous).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/shared/lib/youtube-iframe-api.test.ts`
Expected: FAIL — `Cannot find module './youtube-iframe-api'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/lib/youtube-iframe-api.ts
export interface YouTubePlayerEvent {
  target: YouTubePlayer;
}

export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

export interface YouTubePlayerOptions {
  videoId: string;
  playerVars?: { autoplay?: 0 | 1 };
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
  };
}

export interface YouTubeIframeApi {
  Player: new (
    element: HTMLElement,
    options: YouTubePlayerOptions,
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeIframeApi> | null = null;

export function loadYouTubeIframeApi(): Promise<YouTubeIframeApi> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function resetYouTubeIframeApiForTests(): void {
  apiPromise = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/shared/lib/youtube-iframe-api.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/youtube-iframe-api.ts src/shared/lib/youtube-iframe-api.test.ts
git commit -m "feat: add memoized YouTube IFrame Player API loader"
```

---

### Task 4: `YouTubeCard` component

**Files:**

- Create: `src/shared/components/YouTubeCard.tsx`
- Test: `src/shared/components/YouTubeCard.test.tsx`

**Context:** This is the one place hover/player logic lives — the play-time thumbnail before hover, lazy player construction on first hover, `playVideo()`/`pauseVideo()` on subsequent hovers, and cleanup on unmount. It renders a `data-testid="youtube-card"` container so tests can fire hover events on a stable node even after the thumbnail `<img>` is replaced by the real player.

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/components/YouTubeCard.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YouTubeCard } from "./YouTubeCard";
import { loadYouTubeIframeApi } from "@/src/shared/lib/youtube-iframe-api";
import type {
  YouTubeIframeApi,
  YouTubePlayer,
} from "@/src/shared/lib/youtube-iframe-api";

vi.mock("@/src/shared/lib/youtube-iframe-api", () => ({
  loadYouTubeIframeApi: vi.fn(),
}));

const mockedLoad = vi.mocked(loadYouTubeIframeApi);

function makeFakePlayer(): YouTubePlayer {
  return {
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    destroy: vi.fn(),
  };
}

function makeFakeApi(fakePlayer: YouTubePlayer): YouTubeIframeApi {
  return {
    Player: vi.fn().mockImplementation((_el, options) => {
      options.events.onReady({ target: fakePlayer });
      return fakePlayer;
    }) as unknown as YouTubeIframeApi["Player"],
  };
}

describe("YouTubeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the thumbnail before any hover, without loading the API", () => {
    mockedLoad.mockReturnValue(new Promise(() => {}));
    render(<YouTubeCard videoId="abc123" />);

    expect(
      screen.getByRole("img", { name: "YouTube video thumbnail" }),
    ).toHaveAttribute("src", "https://img.youtube.com/vi/abc123/mqdefault.jpg");
    expect(mockedLoad).not.toHaveBeenCalled();
  });

  it("loads the API and constructs a player on first hover", async () => {
    const fakePlayer = makeFakePlayer();
    const fakeApi = makeFakeApi(fakePlayer);
    mockedLoad.mockResolvedValue(fakeApi);

    render(<YouTubeCard videoId="abc123" />);
    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));

    await waitFor(() => expect(fakeApi.Player).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fakeApi.Player).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        videoId: "abc123",
        playerVars: { autoplay: 1 },
      }),
    );
    expect(fakePlayer.playVideo).toHaveBeenCalled();
  });

  it("reuses the existing player on subsequent hovers instead of reloading the API", async () => {
    const fakePlayer = makeFakePlayer();
    const fakeApi = makeFakeApi(fakePlayer);
    mockedLoad.mockResolvedValue(fakeApi);

    render(<YouTubeCard videoId="abc123" />);
    const card = screen.getByTestId("youtube-card");
    fireEvent.mouseEnter(card);
    await waitFor(() => expect(fakeApi.Player).toHaveBeenCalledTimes(1));

    fireEvent.mouseLeave(card);
    expect(fakePlayer.pauseVideo).toHaveBeenCalledTimes(1);

    fireEvent.mouseEnter(card);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(fakeApi.Player).toHaveBeenCalledTimes(1);
    expect(fakePlayer.playVideo).toHaveBeenCalledTimes(2);
  });

  it("destroys the player on unmount", async () => {
    const fakePlayer = makeFakePlayer();
    const fakeApi = makeFakeApi(fakePlayer);
    mockedLoad.mockResolvedValue(fakeApi);

    const { unmount } = render(<YouTubeCard videoId="abc123" />);
    fireEvent.mouseEnter(screen.getByTestId("youtube-card"));
    await waitFor(() => expect(fakeApi.Player).toHaveBeenCalledTimes(1));

    unmount();
    expect(fakePlayer.destroy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/shared/components/YouTubeCard.test.tsx`
Expected: FAIL — `Cannot find module './YouTubeCard'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/shared/components/YouTubeCard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/src/shared/lib/cn";
import { Badge } from "@/src/shared/components/Badge";
import { youtubeThumbnailUrl } from "@/src/shared/lib/youtube";
import { loadYouTubeIframeApi } from "@/src/shared/lib/youtube-iframe-api";
import type { YouTubePlayer } from "@/src/shared/lib/youtube-iframe-api";

interface YouTubeCardProps {
  videoId: string;
  className?: string;
}

export function YouTubeCard({ videoId, className }: YouTubeCardProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [hovered, setHovered] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  // Lazily loads the API and constructs the player on first hover only —
  // repeated hovers reuse the same instance via the effect below.
  useEffect(() => {
    if (!hovered || playerRef.current) return;
    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new YT.Player(mountRef.current, {
        videoId,
        playerVars: { autoplay: 1 },
        events: {
          onReady: (event) => {
            event.target.playVideo();
            setPlayerReady(true);
          },
        },
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

  useEffect(() => {
    return () => playerRef.current?.destroy();
  }, []);

  return (
    <div
      data-testid="youtube-card"
      className={cn("relative h-[150px] overflow-hidden bg-black", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!playerReady && (
        // eslint-disable-next-line @next/next/no-img-element -- external, per-video thumbnail; not worth an images.remotePatterns entry for one small preview
        <img
          src={youtubeThumbnailUrl(videoId)}
          alt="YouTube video thumbnail"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div ref={mountRef} className="absolute inset-0" />
      {!hovered && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50">
            <span className="ml-0.5 h-0 w-0 border-y-8 border-l-[12px] border-y-transparent border-l-white" />
          </span>
        </span>
      )}
      <Badge className="absolute left-2 top-2">YouTube</Badge>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/shared/components/YouTubeCard.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/YouTubeCard.tsx src/shared/components/YouTubeCard.test.tsx
git commit -m "feat: add YouTubeCard hover-to-play component"
```

---

### Task 5: Wire `YouTubeCard` into `PlayScreen.tsx`

**Files:**

- Modify: `src/features/play/PlayScreen.tsx:222-247`
- Test: `src/features/play/PlayScreen.test.tsx`

**Context:** Only the `youtube`-type branch changes — text items keep today's whole-card-is-a-button behavior untouched, so all existing `PlayScreen.test.tsx` tests (which only use text items) keep passing unmodified. A youtube item with an extractable video ID gets a `<div>` card: `YouTubeCard` on top, a separate "Pick …" button below it (so clicks on the video don't fight the pick action). A youtube item whose value doesn't parse to an ID (shouldn't happen post-Task-8/9 validation, but defensively) falls back to today's badge treatment.

- [ ] **Step 1: Write the failing test**

Add to `src/features/play/PlayScreen.test.tsx`, inside the `describe("PlayScreen", ...)` block (after the existing `textItem` helper, add a sibling helper and a new test):

```tsx
function youtubeItem(id: string, title: string, value: string) {
  return { id, type: "youtube" as const, title, value };
}
```

```tsx
it("shows a real YouTube player for a youtube-type item and selects it via its own pick control, not the video area", async () => {
  const user = userEvent.setup();
  const packWithVideo: Pack = {
    ...SAVE_ONE_PACK,
    groups: [
      {
        id: "g1",
        name: "2016",
        selectionMode: "manual",
        items: [
          youtubeItem("v1", "Guren no Yumiya", "https://youtu.be/KsF_hdjWJjo"),
          textItem("2", "Redo"),
        ],
      },
    ],
  };
  renderScreen(packWithVideo);
  await screen.findByText("Guren no Yumiya");

  expect(
    screen.getByRole("img", { name: "YouTube video thumbnail" }),
  ).toHaveAttribute(
    "src",
    "https://img.youtube.com/vi/KsF_hdjWJjo/mqdefault.jpg",
  );

  await user.click(
    screen.getByRole("button", { name: "Pick Guren no Yumiya" }),
  );
  await user.click(screen.getByRole("button", { name: "Show all" }));
  expect(screen.getByRole("button", { name: "Next round →" })).toBeEnabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/play/PlayScreen.test.tsx`
Expected: FAIL — no `img` with name "YouTube video thumbnail" found (current code only renders a `Badge` for youtube items)

- [ ] **Step 3: Write minimal implementation**

Replace the item-rendering block in `src/features/play/PlayScreen.tsx` (currently lines 222-247):

```tsx
<div className="mb-8 flex flex-wrap gap-4">
  {candidates.slice(0, revealedCount).map((item, index) => {
    const selected = item.id === selectedId;
    const videoId =
      item.type === "youtube" ? extractYouTubeId(item.value) : null;

    if (videoId) {
      return (
        <div
          key={item.id}
          className={cn(
            "w-[200px] flex-none overflow-hidden rounded-2xl border transition-colors",
            selected ? "border-acc bg-acc/10" : "border-border bg-surface",
          )}
        >
          <YouTubeCard videoId={videoId} />
          <button
            type="button"
            onClick={() => setSelectedId(item.id)}
            aria-label={`Pick ${item.title}`}
            className="flex w-full items-center gap-2 p-4 text-left"
          >
            <span
              aria-hidden
              className={cn(
                "h-4 w-4 flex-none rounded border",
                selected ? "border-acc bg-acc" : "border-border-strong",
              )}
            />
            <Text className="flex-1 font-semibold">{item.title}</Text>
            <Text variant="tertiary" className="text-xs">
              {String(index + 1).padStart(2, "0")}
            </Text>
          </button>
        </div>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setSelectedId(item.id)}
        className={cn(
          "w-[200px] flex-none rounded-2xl border p-4 text-left transition-colors",
          selected
            ? "border-acc bg-acc/10"
            : "border-border bg-surface hover:border-border-strong",
        )}
      >
        {item.type === "youtube" && <Badge className="mb-2">YouTube</Badge>}
        <Text className="font-semibold">{item.title}</Text>
        <Text variant="tertiary" className="mt-1 text-xs">
          {String(index + 1).padStart(2, "0")}
        </Text>
      </button>
    );
  })}
</div>
```

Add imports near the top of `src/features/play/PlayScreen.tsx` (alongside the existing `VersusRound` import):

```tsx
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/play/PlayScreen.test.tsx`
Expected: PASS (all existing tests + the new one)

- [ ] **Step 5: Commit**

```bash
git add src/features/play/PlayScreen.tsx src/features/play/PlayScreen.test.tsx
git commit -m "feat: render a real YouTube player for youtube items in PlayScreen"
```

---

### Task 6: Wire `YouTubeCard` into `HeadToHeadRound.tsx`

**Files:**

- Modify: `src/features/play/HeadToHeadRound.tsx`
- Test: `src/features/play/HeadToHeadRound.test.tsx`

**Context:** Same split as Task 5 — text items keep the existing single `<button>` card (so the two existing tests, which only use text items, are untouched); a youtube item with an extractable ID gets `YouTubeCard` plus a separate "Pick …" button beneath it.

- [ ] **Step 1: Write the failing test**

Add to `src/features/play/HeadToHeadRound.test.tsx`:

```tsx
it("shows a real YouTube player for a youtube item and still calls onPick via its own pick control", async () => {
  const user = userEvent.setup();
  const onPick = vi.fn();
  const videoItem = {
    id: "v1",
    type: "youtube" as const,
    title: "Opening theme",
    value: "https://youtu.be/KsF_hdjWJjo",
  };
  render(<HeadToHeadRound left={videoItem} right={RIGHT} onPick={onPick} />);

  expect(
    screen.getByRole("img", { name: "YouTube video thumbnail" }),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Pick Opening theme" }));
  expect(onPick).toHaveBeenCalledWith("v1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/play/HeadToHeadRound.test.tsx`
Expected: FAIL — no `img` with name "YouTube video thumbnail" found

- [ ] **Step 3: Write minimal implementation**

Replace `src/features/play/HeadToHeadRound.tsx` in full:

```tsx
import type { Item } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { extractYouTubeId } from "@/src/shared/lib/youtube";

interface HeadToHeadCardProps {
  item: Item;
  onPick: () => void;
}

function HeadToHeadCard({ item, onPick }: HeadToHeadCardProps) {
  const videoId = item.type === "youtube" ? extractYouTubeId(item.value) : null;

  if (videoId) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors">
        <YouTubeCard videoId={videoId} />
        <button
          type="button"
          onClick={onPick}
          aria-label={`Pick ${item.title}`}
          className="flex min-h-[80px] flex-1 items-center justify-center p-4 text-center transition-colors hover:bg-white/[0.04]"
        >
          <Text className="font-semibold">{item.title}</Text>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Pick ${item.title}`}
      className="flex min-h-[230px] flex-1 flex-col justify-center gap-3 rounded-2xl border border-border bg-surface p-4 text-center transition-colors hover:border-border-strong"
    >
      {item.type === "youtube" && <Badge className="mx-auto">YouTube</Badge>}
      <Text className="font-semibold">{item.title}</Text>
    </button>
  );
}

interface HeadToHeadRoundProps {
  left: Item;
  right: Item;
  onPick: (id: string) => void;
}

export function HeadToHeadRound({ left, right, onPick }: HeadToHeadRoundProps) {
  return (
    <div className="flex items-center gap-4">
      <HeadToHeadCard item={left} onPick={() => onPick(left.id)} />
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border bg-white/[0.04] text-xs font-semibold text-foreground-secondary">
        VS
      </span>
      <HeadToHeadCard item={right} onPick={() => onPick(right.id)} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/play/HeadToHeadRound.test.tsx`
Expected: PASS (all existing tests + the new one)

- [ ] **Step 5: Commit**

```bash
git add src/features/play/HeadToHeadRound.tsx src/features/play/HeadToHeadRound.test.tsx
git commit -m "feat: render a real YouTube player for youtube items in HeadToHeadRound"
```

---

### Task 7: Wire `YouTubeCard` into `VersusRound.tsx`

**Files:**

- Modify: `src/features/play/VersusRound.tsx`
- Create: `src/features/play/VersusRound.test.tsx`

**Context:** Unlike the other two surfaces, the _side_ is the pickable unit here, not individual items — so `SideCard` itself needs no click-target split. But `SideCard` is currently a `<button>` wrapping the item list, and a real `<iframe>`-based player can't be validly nested inside a `<button>`. `SideCard`'s outer element changes from `<button>` to a `<div role="button" tabIndex={0}>` with Enter/Space keyboard handling (matching native button semantics), so a `YouTubeCard` can be nested inside one of its items safely. `VersusRound.test.tsx` doesn't exist yet (today it's only exercised indirectly through `PlayScreen.test.tsx`'s nxn tests) — this task adds a standalone unit test file, matching `HeadToHeadRound.test.tsx`'s existing per-component convention.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/play/VersusRound.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VersusRound } from "./VersusRound";

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

function youtubeItem(id: string, title: string, value: string) {
  return { id, type: "youtube" as const, title, value };
}

const SIDE_A = {
  id: "ca",
  name: "Boys",
  items: [textItem("1", "Naruto"), textItem("2", "Sasuke")],
};
const SIDE_B = { id: "cb", name: "Girls", items: [textItem("3", "Sakura")] };

describe("VersusRound", () => {
  it("renders both sides with a VS divider", () => {
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        revealedCount={2}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Boys")).toBeInTheDocument();
    expect(screen.getByText("Girls")).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
  });

  it("calls onSelect with the side id when a side is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        revealedCount={2}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pick Boys" }));
    expect(onSelect).toHaveBeenCalledWith("ca");
  });

  it("selects a side via the keyboard (Enter)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <VersusRound
        sideA={SIDE_A}
        sideB={SIDE_B}
        revealedCount={2}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    screen.getByRole("button", { name: "Pick Girls" }).focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("cb");
  });

  it("shows a real YouTube player for a youtube-type item within a side", () => {
    const sideWithVideo = {
      id: "ca",
      name: "Boys",
      items: [youtubeItem("v1", "Opening", "https://youtu.be/KsF_hdjWJjo")],
    };
    render(
      <VersusRound
        sideA={sideWithVideo}
        sideB={SIDE_B}
        revealedCount={1}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: "YouTube video thumbnail" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/play/VersusRound.test.tsx`
Expected: FAIL — `role="button"` div not found (current `SideCard` uses a real `<button>`, which the first three assertions actually satisfy already; the 4th test fails because no `YouTubeCard`/thumbnail is rendered yet)

- [ ] **Step 3: Write minimal implementation**

Replace `src/features/play/VersusRound.tsx` in full:

```tsx
import type { Item } from "@/src/shared/types/pack";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { YouTubeCard } from "@/src/shared/components/YouTubeCard";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { cn } from "@/src/shared/lib/cn";

interface VersusSide {
  id: string;
  name: string;
  items: Item[];
}

interface SideCardProps {
  side: VersusSide;
  revealedCount: number;
  selected: boolean;
  onSelect: () => void;
}

function SideCard({ side, revealedCount, selected, onSelect }: SideCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Pick ${side.name}`}
      className={cn(
        "flex flex-1 cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-acc bg-acc/10"
          : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <Text className="text-center font-semibold">{side.name}</Text>
      <div className="flex flex-col gap-2">
        {side.items.slice(0, revealedCount).map((item) => {
          const videoId =
            item.type === "youtube" ? extractYouTubeId(item.value) : null;

          if (videoId) {
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-white/[0.03]"
              >
                <YouTubeCard videoId={videoId} />
                <Text className="p-3 text-sm font-medium">{item.title}</Text>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-white/[0.03] p-3"
            >
              {item.type === "youtube" && (
                <Badge className="mb-2">YouTube</Badge>
              )}
              <Text className="text-sm font-medium">{item.title}</Text>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface VersusRoundProps {
  sideA: VersusSide;
  sideB: VersusSide;
  revealedCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VersusRound({
  sideA,
  sideB,
  revealedCount,
  selectedId,
  onSelect,
}: VersusRoundProps) {
  return (
    <div className="flex items-start gap-4">
      <SideCard
        side={sideA}
        revealedCount={revealedCount}
        selected={selectedId === sideA.id}
        onSelect={() => onSelect(sideA.id)}
      />
      <div className="flex items-center justify-center pt-14">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border bg-white/[0.04] text-xs font-semibold text-foreground-secondary">
          VS
        </span>
      </div>
      <SideCard
        side={sideB}
        revealedCount={revealedCount}
        selected={selectedId === sideB.id}
        onSelect={() => onSelect(sideB.id)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/play/VersusRound.test.tsx`
Expected: PASS (4 tests)

Then also re-run `PlayScreen.test.tsx` since it exercises `VersusRound` indirectly through the nxn tests:

Run: `npm test -- src/features/play/PlayScreen.test.tsx`
Expected: PASS (unchanged — `getByRole("button", { name: "Pick Boys" })` still matches the `div role="button"`)

- [ ] **Step 5: Commit**

```bash
git add src/features/play/VersusRound.tsx src/features/play/VersusRound.test.tsx
git commit -m "feat: render a real YouTube player for youtube items in VersusRound"
```

---

### Task 8: oEmbed validation in `CategoryEditor.tsx`

**Files:**

- Modify: `src/features/create/CategoryEditor.tsx`
- Test: `src/features/create/CategoryEditor.test.tsx`

**Context:** `addItem` becomes `async`. The `text` branch is unchanged behavior (still adds synchronously, no network call). The `youtube` branch: parse the ID first (reject with an inline error, no network call, if the URL doesn't even look like YouTube); then call `fetchYouTubeOEmbed` (disabling Add + showing "Checking…" meanwhile); on `null` show an inline error and don't add; on success, add the item, defaulting the title to the oEmbed result's title when the user left the Title field blank (replacing today's hardcoded `"Untitled"` fallback).

- [ ] **Step 1: Write the failing test**

Add to `src/features/create/CategoryEditor.test.tsx` — first update the imports at the top of the file:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryEditor } from "./CategoryEditor";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";
import type { Category } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/youtube-oembed", () => ({
  fetchYouTubeOEmbed: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(fetchYouTubeOEmbed).mockReset();
});
```

Then add these tests inside the existing `describe("CategoryEditor", ...)` block:

```tsx
it("adds a youtube item after successful oEmbed validation, keeping a typed title", async () => {
  vi.mocked(fetchYouTubeOEmbed).mockResolvedValue({
    title: "Guren no Yumiya (Official)",
  });
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <CategoryEditor category={emptyCategory()} index={0} onChange={onChange} />,
  );

  await user.click(screen.getByRole("button", { name: "Link" }));
  await user.type(
    screen.getByLabelText("Category 1 new item title"),
    "My title",
  );
  await user.type(
    screen.getByLabelText("Category 1 new item link"),
    "https://youtu.be/KsF_hdjWJjo",
  );
  await user.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            type: "youtube",
            title: "My title",
            value: "https://youtu.be/KsF_hdjWJjo",
          }),
        ],
      }),
    ),
  );
});

it("falls back to the oEmbed video title when no title was typed", async () => {
  vi.mocked(fetchYouTubeOEmbed).mockResolvedValue({
    title: "Guren no Yumiya (Official)",
  });
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <CategoryEditor category={emptyCategory()} index={0} onChange={onChange} />,
  );

  await user.click(screen.getByRole("button", { name: "Link" }));
  await user.type(
    screen.getByLabelText("Category 1 new item link"),
    "https://youtu.be/KsF_hdjWJjo",
  );
  await user.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() =>
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ title: "Guren no Yumiya (Official)" }),
        ],
      }),
    ),
  );
});

it("shows an error and does not add when the video can't be found", async () => {
  vi.mocked(fetchYouTubeOEmbed).mockResolvedValue(null);
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <CategoryEditor category={emptyCategory()} index={0} onChange={onChange} />,
  );

  await user.click(screen.getByRole("button", { name: "Link" }));
  await user.type(
    screen.getByLabelText("Category 1 new item link"),
    "https://youtu.be/doesnotexist",
  );
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText("Couldn't find that video — check the link."),
  ).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

it("rejects a non-YouTube-shaped link without calling oEmbed", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <CategoryEditor category={emptyCategory()} index={0} onChange={onChange} />,
  );

  await user.click(screen.getByRole("button", { name: "Link" }));
  await user.type(
    screen.getByLabelText("Category 1 new item link"),
    "not a link",
  );
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText("That doesn't look like a YouTube link."),
  ).toBeInTheDocument();
  expect(fetchYouTubeOEmbed).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/create/CategoryEditor.test.tsx`
Expected: FAIL — items get added with title `"Untitled"` regardless of oEmbed mock, no error text rendered, `fetchYouTubeOEmbed` never called (current code has no oEmbed integration at all)

- [ ] **Step 3: Write minimal implementation**

Replace `src/features/create/CategoryEditor.tsx` in full:

```tsx
"use client";

import { useState } from "react";
import type { Category, Item, ItemType } from "@/src/shared/types/pack";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { cn } from "@/src/shared/lib/cn";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";

interface CategoryEditorProps {
  category: Category;
  index: number;
  onChange: (category: Category) => void;
}

export function CategoryEditor({
  category,
  index,
  onChange,
}: CategoryEditorProps) {
  const [draftType, setDraftType] = useState<ItemType>("text");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [validating, setValidating] = useState(false);
  const [addError, setAddError] = useState("");

  async function addItem() {
    if (!draftValue.trim()) return;
    setAddError("");

    if (draftType === "text") {
      const item: Item = {
        id: crypto.randomUUID(),
        type: "text",
        title: draftValue.trim(),
        value: draftValue.trim(),
      };
      onChange({ ...category, items: [...category.items, item] });
      setDraftTitle("");
      setDraftValue("");
      return;
    }

    const videoId = extractYouTubeId(draftValue.trim());
    if (!videoId) {
      setAddError("That doesn't look like a YouTube link.");
      return;
    }

    setValidating(true);
    const result = await fetchYouTubeOEmbed(draftValue.trim());
    setValidating(false);
    if (!result) {
      setAddError("Couldn't find that video — check the link.");
      return;
    }

    const item: Item = {
      id: crypto.randomUUID(),
      type: "youtube",
      title: draftTitle.trim() || result.title || "Untitled",
      value: draftValue.trim(),
    };
    onChange({ ...category, items: [...category.items, item] });
    setDraftTitle("");
    setDraftValue("");
  }

  function removeItem(itemId: string) {
    onChange({
      ...category,
      items: category.items.filter((item) => item.id !== itemId),
    });
  }

  return (
    <Card className="flex flex-col gap-3 hover:translate-y-0 hover:shadow-none">
      <Input
        value={category.name}
        onChange={(e) => onChange({ ...category, name: e.target.value })}
        placeholder={`Category ${index + 1} name`}
        aria-label={`Category ${index + 1} name`}
        className="font-semibold"
      />

      {category.items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {category.items.map((item) => (
            <li
              key={item.id}
              className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-white/[0.04] px-2.5 py-1 text-sm text-foreground"
            >
              {item.title}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.title}`}
                className="text-foreground-tertiary hover:text-[#ff6b6b]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex w-fit rounded-[9px] border border-border bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => {
              setDraftType("text");
              setAddError("");
            }}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium",
              draftType === "text"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftType("youtube");
              setAddError("");
            }}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium",
              draftType === "youtube"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            Link
          </button>
        </div>
        {draftType === "text" ? (
          <div className="flex gap-2">
            <Input
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addItem();
              }}
              placeholder="Add an item…"
              aria-label={`Category ${index + 1} new item`}
              className="flex-1"
            />
            <Button type="button" onClick={() => void addItem()}>
              Add
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Title"
                aria-label={`Category ${index + 1} new item title`}
                className="flex-1 min-w-[100px]"
              />
              <Input
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addItem();
                }}
                placeholder="YouTube link…"
                aria-label={`Category ${index + 1} new item link`}
                className="flex-[2] min-w-[140px]"
              />
              <Button
                type="button"
                onClick={() => void addItem()}
                disabled={validating}
              >
                {validating ? "Checking…" : "Add"}
              </Button>
            </div>
            {addError && (
              <Text className="text-xs text-[#ff6b6b]">{addError}</Text>
            )}
          </div>
        )}
      </div>

      <Text variant="tertiary" className="text-xs">
        {category.items.length} item{category.items.length === 1 ? "" : "s"}
      </Text>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/create/CategoryEditor.test.tsx`
Expected: PASS (all existing tests + the 4 new ones)

- [ ] **Step 5: Commit**

```bash
git add src/features/create/CategoryEditor.tsx src/features/create/CategoryEditor.test.tsx
git commit -m "feat: validate YouTube links via oEmbed before adding a category item"
```

---

### Task 9: oEmbed validation in `GroupEditor.tsx`

**Files:**

- Modify: `src/features/create/GroupEditor.tsx`
- Create: `src/features/create/GroupEditor.test.tsx`

**Context:** Same change as Task 8, applied to `GroupEditor` (which has the identical pre-existing `addItem` duplication — not being deduped here, matching the design spec's explicit out-of-scope note). `GroupEditor.test.tsx` doesn't exist yet — this task adds one focused on exactly what this task changes (the youtube-item add/validation path); `GroupEditor`'s pre-existing rename/selectionMode/sampleSize behavior is already covered indirectly via `CreatePackForm.test.tsx` and is out of scope to re-test here.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/create/GroupEditor.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupEditor } from "./GroupEditor";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";
import type { Group } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/youtube-oembed", () => ({
  fetchYouTubeOEmbed: vi.fn(),
}));

function emptyGroup(): Group {
  return { id: "g1", name: "", selectionMode: "manual", items: [] };
}

beforeEach(() => {
  vi.mocked(fetchYouTubeOEmbed).mockReset();
});

describe("GroupEditor", () => {
  it("adds a youtube item after successful oEmbed validation, keeping a typed title", async () => {
    vi.mocked(fetchYouTubeOEmbed).mockResolvedValue({
      title: "Guren no Yumiya (Official)",
    });
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(
      screen.getByLabelText("Group 1 new item title"),
      "My title",
    );
    await user.type(
      screen.getByLabelText("Group 1 new item link"),
      "https://youtu.be/KsF_hdjWJjo",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              type: "youtube",
              title: "My title",
              value: "https://youtu.be/KsF_hdjWJjo",
            }),
          ],
        }),
      ),
    );
  });

  it("falls back to the oEmbed video title when no title was typed", async () => {
    vi.mocked(fetchYouTubeOEmbed).mockResolvedValue({
      title: "Guren no Yumiya (Official)",
    });
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(
      screen.getByLabelText("Group 1 new item link"),
      "https://youtu.be/KsF_hdjWJjo",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({ title: "Guren no Yumiya (Official)" }),
          ],
        }),
      ),
    );
  });

  it("shows an error and does not add when the video can't be found", async () => {
    vi.mocked(fetchYouTubeOEmbed).mockResolvedValue(null);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(
      screen.getByLabelText("Group 1 new item link"),
      "https://youtu.be/doesnotexist",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("Couldn't find that video — check the link."),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects a non-YouTube-shaped link without calling oEmbed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(
      screen.getByLabelText("Group 1 new item link"),
      "not a link",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("That doesn't look like a YouTube link."),
    ).toBeInTheDocument();
    expect(fetchYouTubeOEmbed).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/create/GroupEditor.test.tsx`
Expected: FAIL — items get added with title `"Untitled"` regardless of oEmbed mock, no error text rendered, `fetchYouTubeOEmbed` never called

- [ ] **Step 3: Write minimal implementation**

Replace `src/features/create/GroupEditor.tsx` in full:

```tsx
"use client";

import { useState } from "react";
import type { Group, Item, ItemType } from "@/src/shared/types/pack";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { cn } from "@/src/shared/lib/cn";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";

interface GroupEditorProps {
  group: Group;
  index: number;
  removable: boolean;
  onChange: (group: Group) => void;
  onRemove: () => void;
}

export function GroupEditor({
  group,
  index,
  removable,
  onChange,
  onRemove,
}: GroupEditorProps) {
  const [draftType, setDraftType] = useState<ItemType>("text");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [validating, setValidating] = useState(false);
  const [addError, setAddError] = useState("");

  async function addItem() {
    if (!draftValue.trim()) return;
    setAddError("");

    if (draftType === "text") {
      const item: Item = {
        id: crypto.randomUUID(),
        type: "text",
        title: draftValue.trim(),
        value: draftValue.trim(),
      };
      onChange({ ...group, items: [...group.items, item] });
      setDraftTitle("");
      setDraftValue("");
      return;
    }

    const videoId = extractYouTubeId(draftValue.trim());
    if (!videoId) {
      setAddError("That doesn't look like a YouTube link.");
      return;
    }

    setValidating(true);
    const result = await fetchYouTubeOEmbed(draftValue.trim());
    setValidating(false);
    if (!result) {
      setAddError("Couldn't find that video — check the link.");
      return;
    }

    const item: Item = {
      id: crypto.randomUUID(),
      type: "youtube",
      title: draftTitle.trim() || result.title || "Untitled",
      value: draftValue.trim(),
    };
    onChange({ ...group, items: [...group.items, item] });
    setDraftTitle("");
    setDraftValue("");
  }

  function removeItem(itemId: string) {
    onChange({
      ...group,
      items: group.items.filter((item) => item.id !== itemId),
    });
  }

  return (
    <Card className="flex flex-col gap-3 hover:translate-y-0 hover:shadow-none">
      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          placeholder={`Group ${index + 1} name`}
          aria-label={`Group ${index + 1} name`}
          className="flex-1 min-w-[140px] font-semibold"
        />
        <div className="flex rounded-[9px] border border-border bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => onChange({ ...group, selectionMode: "random" })}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
              group.selectionMode === "random"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            Random
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...group,
                selectionMode: "manual",
                sampleSize: undefined,
              })
            }
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
              group.selectionMode === "manual"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            Manual
          </button>
        </div>
        {group.selectionMode === "random" && (
          <Input
            type="number"
            min={1}
            value={group.sampleSize ?? ""}
            onChange={(e) =>
              onChange({
                ...group,
                sampleSize:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            aria-label={`Group ${index + 1} sample size`}
            title="Items drawn per round"
            className="w-16 text-center"
          />
        )}
        {removable && (
          <Button
            variant="ghost"
            type="button"
            onClick={onRemove}
            aria-label={`Remove group ${index + 1}`}
          >
            Remove
          </Button>
        )}
      </div>

      {group.items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {group.items.map((item) => (
            <li
              key={item.id}
              className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-white/[0.04] px-2.5 py-1 text-sm text-foreground"
            >
              {item.title}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.title}`}
                className="text-foreground-tertiary hover:text-[#ff6b6b]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex w-fit rounded-[9px] border border-border bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => {
              setDraftType("text");
              setAddError("");
            }}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium",
              draftType === "text"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftType("youtube");
              setAddError("");
            }}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium",
              draftType === "youtube"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            Link
          </button>
        </div>
        {draftType === "text" ? (
          <div className="flex gap-2">
            <Input
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addItem();
              }}
              placeholder="Add an item…"
              aria-label={`Group ${index + 1} new item`}
              className="flex-1"
            />
            <Button type="button" onClick={() => void addItem()}>
              Add
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Title"
                aria-label={`Group ${index + 1} new item title`}
                className="flex-1 min-w-[100px]"
              />
              <Input
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addItem();
                }}
                placeholder="YouTube link…"
                aria-label={`Group ${index + 1} new item link`}
                className="flex-[2] min-w-[140px]"
              />
              <Button
                type="button"
                onClick={() => void addItem()}
                disabled={validating}
              >
                {validating ? "Checking…" : "Add"}
              </Button>
            </div>
            {addError && (
              <Text className="text-xs text-[#ff6b6b]">{addError}</Text>
            )}
          </div>
        )}
      </div>

      <Text variant="tertiary" className="text-xs">
        {group.items.length} item{group.items.length === 1 ? "" : "s"}
      </Text>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/create/GroupEditor.test.tsx`
Expected: PASS (4 tests)

Then also re-run `CreatePackForm.test.tsx` since it exercises `GroupEditor`'s text-item path indirectly:

Run: `npm test -- src/features/create/CreatePackForm.test.tsx`
Expected: PASS (unchanged — text-item add flow is untouched)

- [ ] **Step 5: Commit**

```bash
git add src/features/create/GroupEditor.tsx src/features/create/GroupEditor.test.tsx
git commit -m "feat: validate YouTube links via oEmbed before adding a group item"
```

---

### Task 10: Verify, whole-branch review, PR, merge

**Files:** none (verification and process only)

- [ ] **Step 1: Run the full verification suite**

```bash
npm test
npm run test:e2e
npm run typecheck
npm run lint
```

Expected: all green. If `npm run lint` flags anything beyond the one intentional `@next/next/no-img-element` suppression in `YouTubeCard.tsx` (which already carries its own justification comment), fix it before proceeding.

- [ ] **Step 2: Dispatch `pr-review-toolkit:code-reviewer` for the whole branch**

Provide the reviewer the full `git diff develop...feature/youtube-embedded-player` (or run it from the branch). Fix any Important/Critical findings and re-run Step 1's verification suite after each fix.

- [ ] **Step 3: Manual browser verification**

Using the Claude Preview tooling against a locally running backend + frontend:

1. Go to Create, paste a real YouTube link (e.g. `https://youtu.be/dQw4w9WgXcQ`) as a group/category item — confirm the Add button shows "Checking…" then adds the item, and that leaving Title blank picks up the real video title.
2. Paste an obviously invalid link (e.g. `https://youtu.be/not-a-real-id-000`) — confirm the inline error and that nothing is added.
3. Publish (or use an existing approved) pack containing that item across each format that renders it (save_one/sacrifice_one via `PlayScreen`, 1v1 via `HeadToHeadRound`, nxn via `VersusRound`) and confirm: thumbnail shows before hover, hovering starts real playback with sound, native YouTube controls are usable, leaving pauses it, and the pick control still works without triggering the player.

- [ ] **Step 4: Push, open PR, merge**

```bash
git push -u origin feature/youtube-embedded-player
gh pr create --title "Add real embedded YouTube player with hover-to-play and oEmbed validation" --body "$(cat <<'EOF'
## Summary
- Real, hover-to-play YouTube embeds (native controls) replace the static badge across PlayScreen, HeadToHeadRound, and VersusRound.
- CategoryEditor/GroupEditor validate pasted YouTube links via oEmbed before adding, and default the title to the real video title when left blank.

## Test plan
- [x] npm test
- [x] npm run test:e2e
- [x] npm run typecheck
- [x] npm run lint
- [x] Manual browser verification across all three play surfaces
EOF
)" --base develop
```

Merge once checks are green (standing authorization to merge self-authored PRs applies). Close velanto-frontend#57 manually afterward (this repo's issues don't auto-close on merge to `develop`).

- [ ] **Step 5: Update task tracker**

Mark all 10 tasks complete.

---

## Self-review notes

- **Spec coverage:** video-ID/thumbnail helper (Task 1) ✓, oEmbed validation (Tasks 2, 8, 9) ✓, IFrame API loader (Task 3) ✓, `YouTubeCard` hover/player behavior (Task 4) ✓, wiring into all three play surfaces incl. the button→div restructuring (Tasks 5-7) ✓, testing per surface and per helper ✓, manual verification (Task 10) ✓.
- **Type consistency:** `extractYouTubeId`/`youtubeThumbnailUrl` (Task 1), `fetchYouTubeOEmbed`/`OEmbedResult` (Task 2), `loadYouTubeIframeApi`/`YouTubePlayer`/`YouTubeIframeApi` (Task 3) are used with identical names and shapes in every later task that imports them.
- **No placeholders:** every step above contains complete, runnable code — no "add validation here"-style gaps.
