# Share Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a copy-link "Share" popover to the Pack and Result screens (velanto-frontend#67); the Result variant encodes the sharer's picks in the URL so an opener sees the sharer's result.

**Architecture:** A `share-url` util encodes/decodes `RecordedPick[]` as a base64url `?p=` query param. A reusable `ShareButton` client component renders an anchored popover (link field + Copy button, UserMenu-style outside-click/Escape). Result screens read `?p=` via a `useResultPicks` hook and fall back to `sessionStorage` when absent; a `shared` flag neutralizes "your pick" copy. All buttons are gated on `pack.status === "approved"`. Frontend-only, no backend changes.

**Tech Stack:** Next.js App Router (React 19), TypeScript, Tailwind v4, Vitest + React Testing Library.

**Branch:** `feature/share-button` (already created, off `develop`; design spec committed at `docs/superpowers/specs/2026-07-09-share-button-design.md`).

**Repo conventions the implementer must follow:**
- Client components need `"use client"` at the top.
- Reuse shared primitives: `Button` / `buttonClassName` (`src/shared/components/Button.tsx`), `Input` (`src/shared/components/Input.tsx`), `Text` (`src/shared/components/Text.tsx`). `cn` helper at `src/shared/lib/cn.ts`.
- Reading `sessionStorage` in an effect uses the established `// eslint-disable-next-line react-hooks/set-state-in-effect` line immediately above the `setState` call (see current `ResultScreen.tsx`) — keep that convention; do NOT introduce a synchronous `setState` in an effect body without it.
- **Per-task verification is `npm test <file>` AND `npm run typecheck` AND `npm run lint`** — all three, every task. (A prior feature shipped a real `set-state-in-effect`/`exhaustive-deps` lint error because lint wasn't run per-task. Do not repeat that.)
- This is the PUBLIC repo — do not add private-backend file paths/internals to any committed file.
- Commit messages end with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

### Task 1: `share-url` encode/decode util

**Files:**
- Create: `src/shared/lib/share-url.ts`
- Test: `src/shared/lib/share-url.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/lib/share-url.test.ts
import { describe, it, expect } from "vitest";
import { encodePicks, decodePicks, buildShareUrl } from "./share-url";
import type { RecordedPick } from "@/src/shared/types/play-results";

describe("share-url", () => {
  it("round-trips group picks", () => {
    const picks: RecordedPick[] = [
      { groupId: "g1", itemId: "i1" },
      { groupId: "g2", itemId: "i2" },
    ];
    expect(decodePicks(encodePicks(picks))).toEqual(picks);
  });

  it("round-trips rank picks with a position field", () => {
    const picks: RecordedPick[] = [
      { groupId: "g1", itemId: "i1", position: 0 },
      { groupId: "g1", itemId: "i2", position: 1 },
    ];
    expect(decodePicks(encodePicks(picks))).toEqual(picks);
  });

  it("produces a URL-safe code (no +, /, or = characters)", () => {
    const picks: RecordedPick[] = Array.from({ length: 8 }, (_, n) => ({
      groupId: `group-${n}`,
      itemId: `item-${n}`,
    }));
    const code = encodePicks(picks);
    expect(code).not.toMatch(/[+/=]/);
  });

  it("returns null for malformed codes rather than throwing", () => {
    expect(decodePicks("")).toBeNull();
    expect(decodePicks("!!!not base64!!!")).toBeNull();
    expect(decodePicks(btoa("not json"))).toBeNull();
    expect(decodePicks(btoa(JSON.stringify({ not: "an array" })))).toBeNull();
    expect(decodePicks(btoa(JSON.stringify([{ groupId: "g1" }])))).toBeNull(); // missing itemId
    expect(decodePicks(btoa(JSON.stringify([{ groupId: 1, itemId: "i1" }])))).toBeNull(); // wrong type
  });

  it("buildShareUrl appends ?p= only when picks are present and non-empty", () => {
    const withPicks = buildShareUrl("/packs/p1/result", [{ groupId: "g1", itemId: "i1" }]);
    expect(withPicks).toContain("/packs/p1/result?p=");

    expect(buildShareUrl("/packs/p1", [])).not.toContain("?p=");
    expect(buildShareUrl("/packs/p1", null)).not.toContain("?p=");
    expect(buildShareUrl("/packs/p1")).not.toContain("?p=");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/lib/share-url.test.ts`
Expected: FAIL — `share-url.ts` does not exist / exports undefined.

- [ ] **Step 3: Write the implementation**

```ts
// src/shared/lib/share-url.ts
import type { RecordedPick } from "@/src/shared/types/play-results";

/**
 * Encodes recorded picks into a URL-safe (base64url) string for the `?p=`
 * share param. Picks are ASCII-only (UUIDs + integers), so btoa is safe.
 */
export function encodePicks(picks: RecordedPick[]): string {
  const b64 = btoa(JSON.stringify(picks));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Reverses encodePicks. Opener-facing and fed an arbitrary query param, so it
 * must never throw: any malformed input (bad base64, bad JSON, wrong shape)
 * returns null and the caller falls back to own-picks/aggregate.
 */
export function decodePicks(code: string): RecordedPick[] | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const parsed: unknown = JSON.parse(atob(padded));
    if (!Array.isArray(parsed)) return null;
    for (const pick of parsed) {
      if (
        typeof pick !== "object" ||
        pick === null ||
        typeof (pick as RecordedPick).groupId !== "string" ||
        typeof (pick as RecordedPick).itemId !== "string" ||
        ((pick as RecordedPick).position !== undefined &&
          typeof (pick as RecordedPick).position !== "number")
      ) {
        return null;
      }
    }
    return parsed as RecordedPick[];
  } catch {
    return null;
  }
}

/** Builds an absolute share URL from the current origin, appending encoded picks when present. */
export function buildShareUrl(path: string, picks?: RecordedPick[] | null): string {
  const base = `${window.location.origin}${path}`;
  return picks && picks.length > 0 ? `${base}?p=${encodePicks(picks)}` : base;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/lib/share-url.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/shared/lib/share-url.ts src/shared/lib/share-url.test.ts
git commit -m "feat: add share-url encode/decode util (#67)"
```

Expected: typecheck clean, lint clean.

---

### Task 2: `ShareButton` component

**Files:**
- Create: `src/features/share/ShareButton.tsx`
- Test: `src/features/share/ShareButton.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/share/ShareButton.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareButton } from "./ShareButton";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

describe("ShareButton", () => {
  it("is closed initially and opens a popover with the URL on click", () => {
    render(<ShareButton path="/packs/p1" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveAttribute("readonly");
    expect(input.value).toContain("/packs/p1");
  });

  it("copies the URL and shows 'Copied!' feedback", async () => {
    render(<ShareButton path="/packs/p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("/packs/p1");
    expect(await screen.findByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("does not show 'Copied!' when the clipboard write fails", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    render(<ShareButton path="/packs/p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Copied!" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("closes on Escape and on outside click", () => {
    render(<ShareButton path="/packs/p1" />);
    const trigger = screen.getByRole("button", { name: "Share" });

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("encodes provided picks into the shared URL", () => {
    render(<ShareButton path="/packs/p1/result" picks={[{ groupId: "g1", itemId: "i1" }]} label="Share result" />);
    fireEvent.click(screen.getByRole("button", { name: "Share result" }));

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toContain("/packs/p1/result?p=");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/share/ShareButton.test.tsx`
Expected: FAIL — `ShareButton.tsx` does not exist.

- [ ] **Step 3: Write the implementation**

```tsx
// src/features/share/ShareButton.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";
import { buildShareUrl } from "@/src/shared/lib/share-url";
import type { RecordedPick } from "@/src/shared/types/play-results";

export function ShareButton({
  path,
  picks,
  label = "Share",
}: {
  path: string;
  picks?: RecordedPick[] | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Built lazily on open: buildShareUrl reads window.location.origin, which only
  // exists client-side, and the input only renders after a click — so no SSR/
  // hydration concern.
  const url = open ? buildShareUrl(path, picks) : "";

  function closeAndRefocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.select();

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeAndRefocus();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      inputRef.current?.select();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        ref={triggerRef}
        variant="secondary"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {label}
      </Button>
      {open && (
        <div
          role="dialog"
          aria-label="Share link"
          className="absolute right-0 top-12 z-10 flex w-[300px] items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          <Input
            ref={inputRef}
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="flex-1"
            aria-label="Share URL"
          />
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      )}
    </div>
  );
}
```

Note: confirm `Input` (`src/shared/components/Input.tsx`) is a `forwardRef` that accepts `ref` — it is. If for any reason it did not forward a ref, fall back to a raw `<input readOnly>` with the same Tailwind classes (`h-11 w-full rounded-[10px] bg-surface border border-border px-4`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/share/ShareButton.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/features/share/ShareButton.tsx src/features/share/ShareButton.test.tsx
git commit -m "feat: add ShareButton popover component (#67)"
```

Expected: typecheck clean, lint clean.

---

### Task 3: Wire ShareButton into the Pack screen

**Files:**
- Modify: `src/features/pack/PackDetailScreen.tsx` (the Play link at lines 43-45)
- Test: `src/features/pack/PackDetailScreen.test.tsx`

- [ ] **Step 1: Add failing tests**

Append these two tests inside the existing `describe("PackDetailScreen", ...)` block in `src/features/pack/PackDetailScreen.test.tsx`:

```tsx
  it("shows a Share button for an approved pack", () => {
    render(<PackDetailScreen pack={BASE_PACK} results={RESULTS} />);
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("hides the Share button for a non-approved pack", () => {
    render(<PackDetailScreen pack={{ ...BASE_PACK, status: "pending" }} results={RESULTS} />);
    expect(screen.queryByRole("button", { name: "Share" })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/pack/PackDetailScreen.test.tsx`
Expected: FAIL — no "Share" button rendered.

- [ ] **Step 3: Implement**

In `src/features/pack/PackDetailScreen.tsx`, add the import near the other imports:

```tsx
import { ShareButton } from "@/src/features/share/ShareButton";
```

Replace the existing Play link (currently lines 43-45):

```tsx
      <Link href={`/packs/${pack.id}/play`} className={buttonClassName("primary", "mb-6 w-fit")}>
        Play
      </Link>
```

with a flex row that adds the Share button for approved packs:

```tsx
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/packs/${pack.id}/play`} className={buttonClassName("primary", "w-fit")}>
          Play
        </Link>
        {pack.status === "approved" && <ShareButton path={`/packs/${pack.id}`} />}
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/pack/PackDetailScreen.test.tsx`
Expected: PASS (existing 3 + 2 new).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/features/pack/PackDetailScreen.tsx src/features/pack/PackDetailScreen.test.tsx
git commit -m "feat: add Share button to pack detail screen (#67)"
```

---

### Task 4: `useResultPicks` hook (shared-vs-own picks source)

**Files:**
- Create: `src/features/result/use-result-picks.ts`
- Test: `src/features/result/use-result-picks.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/result/use-result-picks.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useResultPicks } from "./use-result-picks";
import { encodePicks } from "@/src/shared/lib/share-url";
import { readLastPlayPicks } from "@/src/shared/lib/last-play-storage";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));
vi.mock("@/src/shared/lib/last-play-storage");

beforeEach(() => {
  searchParams = new URLSearchParams();
  vi.mocked(readLastPlayPicks).mockReset();
});

describe("useResultPicks", () => {
  it("returns the decoded shared picks when ?p= is a valid code", () => {
    const shared = [{ groupId: "g1", itemId: "i1" }];
    searchParams = new URLSearchParams({ p: encodePicks(shared) });

    const { result } = renderHook(() => useResultPicks("pack-1"));

    expect(result.current).toEqual({ picks: shared, shared: true });
    expect(readLastPlayPicks).not.toHaveBeenCalled();
  });

  it("falls back to sessionStorage picks when there is no ?p=", () => {
    vi.mocked(readLastPlayPicks).mockReturnValue([{ groupId: "g1", itemId: "i2" }]);

    const { result } = renderHook(() => useResultPicks("pack-1"));

    expect(result.current).toEqual({ picks: [{ groupId: "g1", itemId: "i2" }], shared: false });
  });

  it("falls back to sessionStorage when ?p= is malformed", () => {
    searchParams = new URLSearchParams({ p: "garbage!!!" });
    vi.mocked(readLastPlayPicks).mockReturnValue(null);

    const { result } = renderHook(() => useResultPicks("pack-1"));

    expect(result.current).toEqual({ picks: null, shared: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/result/use-result-picks.test.tsx`
Expected: FAIL — `use-result-picks.ts` does not exist.

- [ ] **Step 3: Write the implementation**

```ts
// src/features/result/use-result-picks.ts
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { decodePicks } from "@/src/shared/lib/share-url";
import type { RecordedPick } from "@/src/shared/types/play-results";

/**
 * The picks to overlay on a result screen. A valid `?p=` share code wins
 * (someone shared their result — shared: true); otherwise this reader's own
 * last play from sessionStorage (shared: false). The live community aggregate
 * is fetched separately and is identical either way.
 */
export function useResultPicks(packId: string): {
  picks: RecordedPick[] | null;
  shared: boolean;
} {
  const searchParams = useSearchParams();
  const code = searchParams.get("p");
  const sharedPicks = code ? decodePicks(code) : null;

  const [ownPicks, setOwnPicks] = useState<RecordedPick[] | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnPicks(readLastPlayPicks(packId));
  }, [packId]);

  if (sharedPicks) return { picks: sharedPicks, shared: true };
  return { picks: ownPicks, shared: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/result/use-result-picks.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/features/result/use-result-picks.ts src/features/result/use-result-picks.test.tsx
git commit -m "feat: add useResultPicks hook for shared-vs-own result picks (#67)"
```

---

### Task 5: Wire the group Result screen (share + shared-mode copy)

**Files:**
- Modify: `src/features/result/ResultScreen.tsx` (the `GroupResultScreen` function)
- Test: `src/features/result/ResultScreen.test.tsx`

- [ ] **Step 1: Add failing tests + mock next/navigation**

At the top of `src/features/result/ResultScreen.test.tsx`, add the `useSearchParams` mock (the file does not currently mock `next/navigation`; the component now needs it). Add after the existing imports and add `encodePicks` to imports:

```tsx
import { encodePicks } from "@/src/shared/lib/share-url";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));
```

Add `vi` to the existing `vitest` import if not present, and reset the param in the existing `beforeEach`:

```tsx
beforeEach(() => {
  sessionStorage.clear();
  searchParams = new URLSearchParams();
});
```

Then add these tests inside `describe("ResultScreen", ...)`:

```tsx
  it("shows a Share result button for an approved pack", () => {
    render(<ResultScreen pack={PACK} results={RESULTS} />);
    expect(screen.getByRole("button", { name: "Share result" })).toBeInTheDocument();
  });

  it("hides the Share result button for a non-approved pack", () => {
    render(<ResultScreen pack={{ ...PACK, status: "pending" }} results={RESULTS} />);
    expect(screen.queryByRole("button", { name: "Share result" })).not.toBeInTheDocument();
  });

  it("renders the sharer's picks and a shared-result note when opened via a ?p= link", async () => {
    searchParams = new URLSearchParams({ p: encodePicks([{ groupId: "g1", itemId: "i1" }]) });

    render(<ResultScreen pack={PACK} results={RESULTS} />);

    expect(await screen.findByText(/viewing a shared result/i)).toBeInTheDocument();
    expect(screen.getByText(/^Pick:\s*Guren no Yumiya/)).toBeInTheDocument();
    expect(screen.queryByText(/Your pick/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/result/ResultScreen.test.tsx`
Expected: FAIL — no "Share result" button, no shared-result note.

- [ ] **Step 3: Implement**

In `src/features/result/ResultScreen.tsx`:

1. Replace the imports block additions — remove the now-unused `useEffect`/`useState`/`readLastPlayPicks` from `GroupResultScreen` and add the new imports:

```tsx
import Link from "next/link";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { ShareButton } from "@/src/features/share/ShareButton";
import { useResultPicks } from "@/src/features/result/use-result-picks";
import { RankResultScreen } from "@/src/features/result/RankResultScreen";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults, RankResults } from "@/src/shared/types/play-results";
```

(Note: `useEffect`, `useState`, `readLastPlayPicks`, and the `RecordedPick` type import are no longer used by this file — remove them so lint stays clean.)

2. Replace the body of `GroupResultScreen` (the `useState`/`useEffect` picks logic through the final `Play again` link) with:

```tsx
function GroupResultScreen({ pack, results }: { pack: Pack; results: PackResults }) {
  const { picks: ownPicks, shared } = useResultPicks(pack.id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
      <Text variant="tertiary" className="mb-2 text-xs uppercase tracking-wide">
        Result
      </Text>
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        {pack.title}
      </Text>
      <Text variant="secondary" className="mb-8">
        {results.totalPlays} play{results.totalPlays === 1 ? "" : "s"} recorded.
      </Text>

      {shared && (
        <Text
          variant="secondary"
          className="mb-6 rounded-[10px] border border-border bg-surface px-4 py-2 text-sm"
        >
          You&apos;re viewing a shared result.
        </Text>
      )}

      <div className="mb-8 flex flex-col gap-4">
        {results.rounds.map((round) => {
          const ownPick = ownPicks?.find((pick) => pick.groupId === round.groupId);
          const ownItem = ownPick
            ? round.items.find((item) => item.itemId === ownPick.itemId)
            : undefined;

          return (
            <Card key={round.groupId} className="hover:translate-y-0 hover:shadow-none">
              <Text className="mb-2 font-semibold">{round.groupName}</Text>
              {ownItem ? (
                <div className="flex items-center justify-between gap-2">
                  <Text variant="secondary" className="text-sm">
                    {shared ? "Pick" : "Your pick"}: {ownItem.itemTitle}
                  </Text>
                  <Text className="text-sm font-semibold text-acc">{ownItem.percentage}%</Text>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {round.items.map((item) => (
                    <li key={item.itemId} className="flex items-center justify-between gap-2">
                      <Text variant="secondary" className="text-sm">
                        {item.itemTitle}
                      </Text>
                      <Text variant="tertiary" className="text-sm">
                        {item.percentage}%
                      </Text>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Link href={`/packs/${pack.id}/play`} className={buttonClassName("primary", "w-fit")}>
          Play again
        </Link>
        {pack.status === "approved" && (
          <ShareButton
            path={`/packs/${pack.id}/result`}
            picks={ownPicks}
            label="Share result"
          />
        )}
      </div>
    </div>
  );
}
```

Leave the top-level `ResultScreen` wrapper (the `rank_blind` delegation) unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/result/ResultScreen.test.tsx`
Expected: PASS (existing 6 + 3 new). The existing "Your pick" test still passes because `shared` is false without a `?p=` param.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/features/result/ResultScreen.tsx src/features/result/ResultScreen.test.tsx
git commit -m "feat: add Share result + shared-result mode to group result screen (#67)"
```

---

### Task 6: Wire the rank Result screen (share + shared-mode copy)

**Files:**
- Modify: `src/features/result/RankResultScreen.tsx`
- Test: `src/features/result/RankResultScreen.test.tsx`

- [ ] **Step 1: Inspect the existing test file, add mock + failing tests**

`src/features/result/RankResultScreen.test.tsx` exists. Add (or extend) the `next/navigation` mock the same way as Task 5 — at the top of the file:

```tsx
import { encodePicks } from "@/src/shared/lib/share-url";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));
```

Ensure `vi` and `beforeEach` are imported from `vitest`, and reset `searchParams = new URLSearchParams();` plus `sessionStorage.clear();` in a `beforeEach`. Then add:

```tsx
  it("shows a Share result button for an approved pack", () => {
    render(<RankResultScreen pack={RANK_PACK} results={RANK_RESULTS} />);
    expect(screen.getByRole("button", { name: "Share result" })).toBeInTheDocument();
  });

  it("hides the Share result button for a non-approved pack", () => {
    render(<RankResultScreen pack={{ ...RANK_PACK, status: "pending" }} results={RANK_RESULTS} />);
    expect(screen.queryByRole("button", { name: "Share result" })).not.toBeInTheDocument();
  });

  it("shows the shared-result note when opened via a ?p= link", async () => {
    searchParams = new URLSearchParams({
      p: encodePicks([{ groupId: "g1", itemId: "i1", position: 0 }]),
    });
    render(<RankResultScreen pack={RANK_PACK} results={RANK_RESULTS} />);
    expect(await screen.findByText(/viewing a shared result/i)).toBeInTheDocument();
  });
```

Use whatever the existing test's pack/results fixtures are named; if they are inline, extract them to `RANK_PACK` / `RANK_RESULTS` consts (with `status: "approved"`) so the new tests can reuse and override them. The rank fixture must include at least one round `g1` with an item `i1` and `positionCounts` long enough to index `position: 0`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/result/RankResultScreen.test.tsx`
Expected: FAIL — no "Share result" button / no shared note.

- [ ] **Step 3: Implement**

In `src/features/result/RankResultScreen.tsx`:

1. Replace the picks-source imports/logic. Remove `useEffect`, `useState`, and `readLastPlayPicks`; add:

```tsx
import { ShareButton } from "@/src/features/share/ShareButton";
import { useResultPicks } from "@/src/features/result/use-result-picks";
```

2. Replace the current `const [ownPicks, setOwnPicks] = useState...; useEffect(...)` block (lines 13-20) with:

```tsx
  const { picks: ownPicks, shared } = useResultPicks(pack.id);
```

(The `RecordedPick` type import may now be unused — remove it if lint flags it.)

3. Add the shared-result note immediately after the "plays recorded" `Text` (after line 32):

```tsx
      {shared && (
        <Text
          variant="secondary"
          className="mb-6 rounded-[10px] border border-border bg-surface px-4 py-2 text-sm"
        >
          You&apos;re viewing a shared result.
        </Text>
      )}
```

4. Neutralize the ownership copy in the per-item block. Change the `You placed this #{ownPick.position + 1}` line so it reads:

```tsx
                      {ownPick && ownPick.position !== undefined ? (
                        <Text className="pl-10 text-xs text-acc">
                          {shared ? "Placed" : "You placed this"} #{ownPick.position + 1} ·{" "}
                          {Math.max(item.positionCounts[ownPick.position] - 1, 0)} other play
                          {item.positionCounts[ownPick.position] - 1 === 1 ? "" : "s"} agreed
                        </Text>
                      ) : (
                        playedThisRound && (
                          <Text variant="tertiary" className="pl-10 text-xs">
                            {shared ? "Not in this play this round" : "Not in your play this round"}
                          </Text>
                        )
                      )}
```

5. Replace the final `Play again` link with the action row (matching Task 5):

```tsx
      <div className="flex items-center gap-3">
        <Link href={`/packs/${pack.id}/play`} className={buttonClassName("primary", "w-fit")}>
          Play again
        </Link>
        {pack.status === "approved" && (
          <ShareButton
            path={`/packs/${pack.id}/result`}
            picks={ownPicks}
            label="Share result"
          />
        )}
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/result/RankResultScreen.test.tsx`
Expected: PASS (existing tests + 3 new).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/features/result/RankResultScreen.tsx src/features/result/RankResultScreen.test.tsx
git commit -m "feat: add Share result + shared-result mode to rank result screen (#67)"
```

---

### Task 7: Verify, whole-branch review, manual verify, PR, merge, close issue

**Files:** none (integration task)

- [ ] **Step 1: Full local verification**

```bash
npm test && npm run typecheck && npm run lint
```

Expected: entire unit suite green, typecheck clean, lint clean. (Do NOT run `npm run test:e2e` while a Claude Preview dev server holds port 3000 — stop it first if needed; e2e is not required for this branch since it merges to `develop`, not `main`.)

- [ ] **Step 2: Whole-branch code review**

Dispatch `pr-review-toolkit:code-reviewer` against the full branch diff (`git diff develop...HEAD`). Also worth a `ui-guardian` pass (design-token/a11y adherence on the new popover) since this adds UI. Fix any real findings, re-run Step 1, and re-review if changes were substantive.

- [ ] **Step 3: Manual browser verification (live backend)**

With both dev servers running (backend on 3001, frontend on 3000):
1. Register/login, create and get an approved pack (create a pack; approve it via a moderator account if it starts pending — trusted users' packs auto-approve).
2. Play it to a result. Confirm a "Share result" button appears next to "Play again"; open it, confirm the popover shows a `/packs/<id>/result?p=...` URL and Copy shows "Copied!".
3. Copy the URL, open it in a fresh/logged-out session (or incognito). Confirm the result renders **the sharer's picks** with the "You're viewing a shared result" note and neutral "Pick:" labels, against the live aggregate.
4. Open the plain `/packs/<id>/result` (no `?p=`) in that fresh session — confirm it shows own/no picks (not the sharer's).
5. On the pack detail page, confirm the "Share" button copies `/packs/<id>`.
6. Confirm the Share button is absent on a pending/rejected pack detail page (view one as its owner).

- [ ] **Step 4: Push, PR, merge**

```bash
git push -u origin feature/share-button
```

Open a PR into `develop` (not `main`) titled `Add Share copy-link popover to Pack and Result screens (#67)`, body summarizing the change + the manual test plan and including `Closes #67`. Merge once green (standing authorization covers merging Claude-authored PRs).

- [ ] **Step 5: Close the issue + sync local**

Since this repo's issues only auto-close on merge to `main`, add a closing comment to velanto-frontend#67 noting the merge to `develop`, then close it via the GitHub API. Finally:

```bash
git checkout develop && git pull
git branch -d feature/share-button
```

---

## Self-Review

**Spec coverage:**
- Copy-link popover on Pack + Result screens → Tasks 2, 3, 5, 6. ✓
- Read-only link field + Copy button + "Copied!" feedback → Task 2. ✓
- Outside-click/Escape close → Task 2. ✓
- `navigator.clipboard.writeText` → Task 2. ✓
- Approved-packs-only gating → Tasks 3, 5, 6. ✓
- Shared result shows sharer's picks (encode in URL, decode on open) → Tasks 1, 4, 5, 6. ✓
- Both group and rank_blind formats → Tasks 5, 6 (format-agnostic encoding in Task 1). ✓
- Shared-mode relabeling + note → Tasks 5, 6. ✓
- Testing plan (unit + manual) → per-task tests + Task 7. ✓

**Placeholder scan:** No TBD/TODO; all code shown in full. ✓

**Type consistency:** `RecordedPick` (`{groupId, itemId, position?}`) used consistently across `share-url`, `useResultPicks`, both result screens. `buildShareUrl(path, picks?)`, `encodePicks(picks)`, `decodePicks(code)`, `useResultPicks(packId) → {picks, shared}` signatures match across all call sites. `ShareButton` props `{path, picks?, label?}` match all three call sites (Task 3 omits `picks`, Tasks 5/6 pass `picks` + `label`). ✓
