# Rank Blind Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create, play, and see results for `rank_blind` packs — Create reuses the existing groups-based flow for free, Play gets a dedicated one-item-at-a-time-into-a-slot component, Result gets a dedicated average-position/per-position-breakdown view.

**Architecture:** `rank_blind` reuses the exact `Group[]` shape `save_one`/`sacrifice_one` already use, so Create needs only a new format button. Play gets a new top-level component (`RankPlayScreen`) alongside the existing `PlayScreen`, since its state machine (place one item at a time into a numbered slot, per-round interstitial) is structurally different, not a variant of the existing reveal-and-pick pattern. Result gets a new top-level component (`RankResultScreen`) that `ResultScreen` delegates to based on `results.format`, keeping the existing percentage-based rendering untouched for the other three formats.

**Tech Stack:** Next.js App Router, TypeScript, Vitest + React Testing Library, `userEvent`.

---

### Task 1: Data model additions

**Files:**

- Modify: `src/shared/types/pack.ts`
- Modify: `src/shared/types/play-results.ts`
- Modify: `src/shared/lib/get-results-server.ts`

This task is type declarations only — nothing consumes these new types yet, so there's no failing behavior to demonstrate first. Every later task's `npm run typecheck` run is what verifies these types are correct and usable.

- [ ] **Step 1: Add `"rank_blind"` to `PackFormat`**

In `src/shared/types/pack.ts`, change:

```typescript
export type PackFormat = "save_one" | "sacrifice_one" | "nxn";
```

to:

```typescript
export type PackFormat = "save_one" | "sacrifice_one" | "nxn" | "rank_blind";
```

- [ ] **Step 2: Add rank_blind result types to `play-results.ts`**

`src/shared/types/play-results.ts` currently has:

```typescript
export interface RecordedPick {
  groupId: string;
  itemId: string;
}

export interface RoundResultItem {
  itemId: string;
  itemTitle: string;
  count: number;
  percentage: number;
}

export interface RoundResult {
  groupId: string;
  groupName: string;
  items: RoundResultItem[];
}

export interface PackResults {
  packId: string;
  totalPlays: number;
  rounds: RoundResult[];
}
```

Replace it with:

```typescript
export interface RecordedPick {
  groupId: string;
  itemId: string;
  // rank_blind only: the 0-indexed slot this item was placed into within
  // its group's ranking. Absent for save_one/sacrifice_one/nxn picks.
  position?: number;
}

export interface RoundResultItem {
  itemId: string;
  itemTitle: string;
  count: number;
  percentage: number;
}

export interface RoundResult {
  groupId: string;
  groupName: string;
  items: RoundResultItem[];
}

export interface PackResults {
  packId: string;
  // Already sent by the backend for every non-rank_blind pack; typed now so
  // ResultScreen can discriminate between PackResults and RankResults.
  format: "save_one" | "sacrifice_one" | "nxn";
  totalPlays: number;
  rounds: RoundResult[];
}

export interface RankResultItem {
  itemId: string;
  itemTitle: string;
  // How many recorded plays included this item in this group's ranking at
  // all — a group's ranking can sample fewer than all of its items
  // (selectionMode: "random"), so an item may not appear in every play.
  timesRanked: number;
  // Mean 0-indexed placement across the plays that included this item.
  // Lower is better (0 = always placed first). 0 when timesRanked is 0.
  averagePosition: number;
  // Histogram of this item's placements: positionCounts[i] = how many
  // recorded plays placed this item at 0-indexed position i. Length equals
  // the group's slot count.
  positionCounts: number[];
}

export interface RankRoundResult {
  groupId: string;
  groupName: string;
  items: RankResultItem[];
}

export interface RankResults {
  packId: string;
  format: "rank_blind";
  totalPlays: number;
  rounds: RankRoundResult[];
}
```

- [ ] **Step 3: Update `getResultsServer`'s return type**

`src/shared/lib/get-results-server.ts` currently:

```typescript
import type { PackResults } from "@/src/shared/types/play-results";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Server Component-only fetch, mirroring getPackServer's cache: "no-store"
 * rationale — aggregate results should reflect the play just recorded.
 */
export async function getResultsServer(packId: string): Promise<PackResults> {
  const res = await fetch(`${API_BASE_URL}/packs/${packId}/results`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to load results: ${res.status}`);
  return (await res.json()) as PackResults;
}
```

Change the import and return type only (fetch/error logic is unchanged):

```typescript
import type { PackResults, RankResults } from "@/src/shared/types/play-results";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Server Component-only fetch, mirroring getPackServer's cache: "no-store"
 * rationale — aggregate results should reflect the play just recorded.
 */
export async function getResultsServer(
  packId: string,
): Promise<PackResults | RankResults> {
  const res = await fetch(`${API_BASE_URL}/packs/${packId}/results`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to load results: ${res.status}`);
  return (await res.json()) as PackResults | RankResults;
}
```

- [ ] **Step 4: Run the type checker**

Run: `npm run typecheck`
Expected: no errors. (`PackResults` gained a required `format` field — check the output doesn't flag any existing literal `PackResults` object as missing it. If it does, the fixtures needing `format` are fixed in Task 2/6/7 below where they're touched anyway; if unrelated code breaks, add `format` to that literal now.)

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/pack.ts src/shared/types/play-results.ts src/shared/lib/get-results-server.ts
git commit -m "feat: add rank_blind types (PackFormat, RankResults, RecordedPick.position)"
```

---

### Task 2: FORMAT_LABELS entry for rank_blind

**Files:**

- Modify: `src/shared/lib/pack-display.ts`
- Test: `src/shared/lib/pack-display.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/shared/lib/pack-display.test.ts`, inside the existing `describe("FORMAT_LABELS", ...)` block:

```typescript
it("has a human-readable label for every supported format", () => {
  expect(FORMAT_LABELS.save_one).toBe("Save One");
  expect(FORMAT_LABELS.sacrifice_one).toBe("Sacrifice One");
  expect(FORMAT_LABELS.nxn).toBe("NxN");
  expect(FORMAT_LABELS.rank_blind).toBe("Rank Blind");
});
```

(This replaces the existing test of the same name — it's the same test, just asserting one more format.)

Also add, inside the existing `describe("getRoundsCount", ...)` block:

```typescript
it("counts groups as rounds for rank_blind packs", () => {
  const pack: Pack = {
    ...BASE_PACK,
    format: "rank_blind",
    groups: [
      { id: "g1", name: "Openers", selectionMode: "manual", items: [] },
      {
        id: "g2",
        name: "Closers",
        selectionMode: "random",
        sampleSize: 2,
        items: [],
      },
    ],
  };

  expect(getRoundsCount(pack)).toBe(2);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- pack-display.test.ts`
Expected: FAIL — `FORMAT_LABELS.rank_blind` is `undefined`, not `"Rank Blind"`.

- [ ] **Step 3: Add the label**

In `src/shared/lib/pack-display.ts`:

```typescript
export const FORMAT_LABELS: Record<Pack["format"], string> = {
  save_one: "Save One",
  sacrifice_one: "Sacrifice One",
  nxn: "NxN",
  rank_blind: "Rank Blind",
};
```

`getRoundsCount` needs no change — its existing `pack.format === "nxn" ? (pack.versusRounds ?? 0) : (pack.groups?.length ?? 0)` already falls through correctly for rank_blind.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- pack-display.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/pack-display.ts src/shared/lib/pack-display.test.ts
git commit -m "feat: add rank_blind to FORMAT_LABELS"
```

---

### Task 3: Create flow — Rank Blind format button

**Files:**

- Modify: `src/features/create/CreatePackForm.tsx`
- Test: `src/features/create/CreatePackForm.test.tsx`

No changes needed to `validate()` or `handleSubmit()`'s payload builder — both already branch only on `format === "nxn"` vs. everything else, and rank_blind is groups-shaped like save_one/sacrifice_one, so it automatically takes the existing groups path.

- [ ] **Step 1: Write the failing test**

Add a new `describe` block to `src/features/create/CreatePackForm.test.tsx`, after the existing `describe("nxn format", ...)` block (before its closing and the file's final `});`):

```typescript
describe("rank_blind format", () => {
  it("shows the Groups section (not Categories) when Rank Blind is selected", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(
      await screen.findByRole("button", { name: /^Rank Blind/ }),
    );

    expect(
      screen.getByRole("button", { name: "+ Add group (one more round)" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Category 1 name")).not.toBeInTheDocument();
  });

  it("submits a valid rank_blind pack with the same groups payload shape as save_one", async () => {
    const user = userEvent.setup();
    vi.mocked(packsClient.create).mockResolvedValue({
      id: "pack-rank",
      title: "Anime Openers, Ranked",
      description: "Place each pick blind into a growing ranked list.",
      coverTone: "#2b2a3a",
      format: "rank_blind",
      tags: [],
      groups: [],
      authorId: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    renderForm();
    await user.click(
      await screen.findByRole("button", { name: /^Rank Blind/ }),
    );
    await fillMinimalValidPack(user);

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/packs/pack-rank"));
    expect(packsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "rank_blind",
        groups: expect.arrayContaining([
          expect.objectContaining({ name: "2016" }),
        ]),
      }),
    );
    expect(packsClient.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ categories: expect.anything() }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- CreatePackForm.test.tsx`
Expected: FAIL — no button with accessible name matching `/^Rank Blind/` exists yet.

- [ ] **Step 3: Add the format button**

In `src/features/create/CreatePackForm.tsx`, inside the `Format` section's button row, add a fourth button right after the existing NxN button (before the row's closing `</div>`):

```tsx
<button
  type="button"
  onClick={() => setFormat("rank_blind")}
  aria-pressed={format === "rank_blind"}
  className={cn(
    "flex-1 rounded-[12px] border px-4 py-3 text-left transition-colors",
    format === "rank_blind"
      ? "border-acc/40 bg-acc/5"
      : "border-border bg-white/[0.02]",
  )}
>
  <Text className="font-semibold">Rank Blind</Text>
  <Text variant="secondary" className="mt-1 text-xs">
    Place each pick blind into a growing ranked list.
  </Text>
</button>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- CreatePackForm.test.tsx`
Expected: PASS (all tests in the file, including the two new ones)

- [ ] **Step 5: Commit**

```bash
git add src/features/create/CreatePackForm.tsx src/features/create/CreatePackForm.test.tsx
git commit -m "feat: add Rank Blind format button to Create flow"
```

---

### Task 4: Play flow — `RankPlayScreen` component

**Files:**

- Create: `src/features/play/RankPlayScreen.tsx`
- Test: `src/features/play/RankPlayScreen.test.tsx`

This reuses `resolveRoundCandidates(group)` (`src/features/play/round-sampling.ts`) unchanged — it already returns items in stored order for `selectionMode: "manual"` groups, or a fresh shuffled sample of `sampleSize` for `"random"` groups. The candidate array's length _is_ the round's slot count; no separate slot-count calculation is needed client-side.

- [ ] **Step 1: Write the failing test**

Create `src/features/play/RankPlayScreen.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RankPlayScreen } from "./RankPlayScreen";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Pack } from "@/src/shared/types/pack";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/src/shared/lib/auth-client", () => ({
  authClient: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("@/src/shared/lib/plays-client", () => ({
  playsClient: {
    record: vi.fn().mockResolvedValue({ id: "play-1" }),
  },
}));

const MOCK_USER = {
  id: "u1",
  email: "a@example.com",
  username: "alice",
  role: "user" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

const RANK_BLIND_PACK: Pack = {
  id: "pack-rank",
  title: "Anime Openers, Ranked",
  description: "Place each pick blind into a growing ranked list.",
  coverTone: "#2b2a3a",
  format: "rank_blind",
  tags: ["Anime"],
  groups: [
    {
      id: "g1",
      name: "Openers",
      selectionMode: "manual",
      items: [textItem("i1", "Kaikai Kitan"), textItem("i2", "Redo")],
    },
    {
      id: "g2",
      name: "Closers",
      selectionMode: "manual",
      items: [textItem("i3", "Silhouette")],
    },
  ],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderScreen(pack: Pack) {
  return render(
    <AuthProvider>
      <RankPlayScreen pack={pack} />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.refresh).mockResolvedValue({
    accessToken: "t",
    user: MOCK_USER,
  });
  vi.mocked(playsClient.record).mockResolvedValue({ id: "play-1" });
  sessionStorage.clear();
});

describe("RankPlayScreen", () => {
  it("prompts to log in when there is no session", async () => {
    vi.mocked(authClient.refresh).mockRejectedValue(
      new ApiError(401, "Unauthorized", null),
    );
    renderScreen(RANK_BLIND_PACK);

    expect(
      await screen.findByText("You need to be logged in to play a pack."),
    ).toBeInTheDocument();
  });

  it("shows the first item and one empty numbered slot per item in a manual-mode round", async () => {
    renderScreen(RANK_BLIND_PACK);

    expect(await screen.findByText("Kaikai Kitan")).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 2")).toBeInTheDocument();
    expect(screen.getAllByText("Place here")).toHaveLength(2);
  });

  it("places the current item into the slot the player clicks, out of numeric order", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    // Place the first item ("Kaikai Kitan") into slot #2, not #1.
    await user.click(screen.getByText("#2"));

    expect(screen.getByText("Redo")).toBeInTheDocument(); // now showing the 2nd item
    const slot2 = screen.getByText("#2").closest("button")!;
    expect(slot2).toHaveTextContent("Kaikai Kitan");
  });

  it("shows a round-complete summary and advances to the next round", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    await user.click(screen.getByText("#1"));
    await screen.findByText("Redo");
    await user.click(screen.getByText("#2"));

    expect(await screen.findByText("Openers ranked")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next round →" }));

    expect(await screen.findByText("Silhouette")).toBeInTheDocument();
    expect(screen.getByText("Round 2 of 2")).toBeInTheDocument();
  });

  it("records the accumulated picks once, after the last round, then shows the finished state", async () => {
    const user = userEvent.setup();
    renderScreen(RANK_BLIND_PACK);
    await screen.findByText("Kaikai Kitan");

    await user.click(screen.getByText("#1"));
    await screen.findByText("Redo");
    await user.click(screen.getByText("#2"));
    await user.click(
      await screen.findByRole("button", { name: "Next round →" }),
    );

    await screen.findByText("Silhouette");
    await user.click(screen.getByText("#1"));

    expect(await screen.findByText("Your ranking is done")).toBeInTheDocument();
    expect(playsClient.record).toHaveBeenCalledTimes(1);
    expect(playsClient.record).toHaveBeenCalledWith("pack-rank", {
      picks: [
        { groupId: "g1", itemId: "i1", position: 0 },
        { groupId: "g1", itemId: "i2", position: 1 },
        { groupId: "g2", itemId: "i3", position: 0 },
      ],
    });
    await waitFor(() =>
      expect(
        JSON.parse(sessionStorage.getItem("velanto:last-play:pack-rank")!),
      ).toEqual([
        { groupId: "g1", itemId: "i1", position: 0 },
        { groupId: "g1", itemId: "i2", position: 1 },
        { groupId: "g2", itemId: "i3", position: 0 },
      ]),
    );
    expect(
      screen.getByRole("link", { name: "See your result" }),
    ).toHaveAttribute("href", "/packs/pack-rank/result");
  });

  it("sizes a random-mode round's slots to sampleSize, not the full item count", async () => {
    const randomPack: Pack = {
      ...RANK_BLIND_PACK,
      groups: [
        {
          id: "g1",
          name: "Closers",
          selectionMode: "random",
          sampleSize: 2,
          items: [
            textItem("i1", "A"),
            textItem("i2", "B"),
            textItem("i3", "C"),
          ],
        },
      ],
    };
    renderScreen(randomPack);

    await screen.findByText("Round 1 of 1");
    expect(screen.getAllByText("Place here")).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- RankPlayScreen.test.tsx`
Expected: FAIL — `RankPlayScreen` module doesn't exist yet.

- [ ] **Step 3: Write the component**

Create `src/features/play/RankPlayScreen.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { cn } from "@/src/shared/lib/cn";
import { playsClient } from "@/src/shared/lib/plays-client";
import { writeLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { resolveRoundCandidates } from "@/src/features/play/round-sampling";
import type { Pack, Item } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

export function RankPlayScreen({ pack }: { pack: Pack }) {
  const { status } = useAuth();
  const router = useRouter();
  const groups = pack.groups ?? [];
  const totalRounds = groups.length;

  const [roundIndex, setRoundIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<number, Item>>({});
  const [allPicks, setAllPicks] = useState<RecordedPick[]>([]);

  const group = roundIndex < totalRounds ? groups[roundIndex] : undefined;
  // Re-sampled only when the round changes, not on every render — same
  // rationale as PlayScreen's own `candidates` useMemo.
  const candidates = useMemo(
    () => (group ? resolveRoundCandidates(group) : []),
    [group],
  );
  const slotCount = candidates.length;
  const placedCount = Object.keys(placements).length;
  const roundDone = slotCount > 0 && placedCount >= slotCount;
  const isLastRound = roundIndex >= totalRounds - 1;
  const isFinished = totalRounds > 0 && isLastRound && roundDone;
  const isRoundComplete = roundDone && !isFinished;
  const currentItem = !roundDone ? candidates[placedCount] : undefined;

  function place(slotIndex: number) {
    if (!group || placements[slotIndex] || placedCount >= slotCount) return;
    const item = candidates[placedCount];
    const nextPlacements = { ...placements, [slotIndex]: item };
    setPlacements(nextPlacements);
    if (Object.keys(nextPlacements).length >= slotCount) {
      const roundPicks: RecordedPick[] = Object.entries(nextPlacements).map(
        ([position, placedItem]) => ({
          groupId: group.id,
          itemId: placedItem.id,
          position: Number(position),
        }),
      );
      setAllPicks((prev) => [...prev, ...roundPicks]);
    }
  }

  function goToNextRound() {
    setRoundIndex((prev) => prev + 1);
    setPlacements({});
  }

  // Fires once when the last round's last item is placed — mirrors
  // PlayScreen's recordedRef guard.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || recordedRef.current) return;
    recordedRef.current = true;
    playsClient
      .record(pack.id, { picks: allPicks })
      .then(() => writeLastPlayPicks(pack.id, allPicks))
      .catch(() => undefined);
  }, [isFinished, pack.id, allPicks]);

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">
          You need to be logged in to play a pack.
        </Text>
        <Button className="mt-4" onClick={() => router.push("/auth")}>
          Log in
        </Button>
      </div>
    );
  }

  const progressPct = isFinished
    ? 100
    : Math.round((roundIndex / Math.max(totalRounds, 1)) * 100);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <Text variant="tertiary" className="text-xs uppercase tracking-wide">
            {isFinished
              ? "Complete"
              : `Round ${roundIndex + 1} of ${totalRounds}`}
          </Text>
        </div>
        <div className="h-[3px] w-full rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-acc transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {group && !roundDone && (
        <>
          <section className="mb-6 text-center">
            <Text as="h1" variant="title" className="mb-2 text-3xl">
              {group.name}
            </Text>
            <Text variant="secondary">
              Choose where this one goes — item {placedCount + 1} of {slotCount}
            </Text>
          </section>

          <div className="mb-8 flex justify-center">
            <div className="w-[230px] rounded-2xl border border-acc bg-surface p-4 text-center">
              <Text className="font-semibold">{currentItem?.title}</Text>
            </div>
          </div>

          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: slotCount }, (_, slotIndex) => {
              const filled = placements[slotIndex];
              return (
                <button
                  key={slotIndex}
                  type="button"
                  disabled={Boolean(filled)}
                  onClick={() => place(slotIndex)}
                  className={cn(
                    "flex min-h-[100px] flex-col justify-between rounded-2xl border p-3 text-left transition-colors",
                    filled
                      ? "border-border bg-surface"
                      : "border-dashed border-border-strong bg-white/[0.02] hover:border-acc/40",
                  )}
                >
                  <Text variant="tertiary" className="text-xs font-semibold">
                    #{slotIndex + 1}
                  </Text>
                  <Text
                    className={cn(
                      "text-sm font-semibold",
                      !filled && "text-foreground-tertiary",
                    )}
                  >
                    {filled ? filled.title : "Place here"}
                  </Text>
                </button>
              );
            })}
          </div>
        </>
      )}

      {isRoundComplete && group && (
        <section className="mb-10 text-center">
          <Text as="h1" variant="title" className="mb-2 text-3xl">
            {group.name} ranked
          </Text>
          <div className="mb-8 flex flex-col gap-2 text-left">
            {Array.from({ length: slotCount }, (_, slotIndex) => (
              <div
                key={slotIndex}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <Text variant="tertiary" className="text-xs font-semibold">
                  #{slotIndex + 1}
                </Text>
                <Text className="font-semibold">
                  {placements[slotIndex]?.title}
                </Text>
              </div>
            ))}
          </div>
          <Button onClick={goToNextRound}>Next round →</Button>
        </section>
      )}

      {isFinished && (
        <section className="mb-10 text-center">
          <Text as="h1" variant="title" className="mb-2 text-3xl">
            Your ranking is done
          </Text>
          <Text variant="secondary" className="mb-4">
            All {totalRounds} round{totalRounds === 1 ? "" : "s"} placed, blind.
          </Text>
          <Link
            href={`/packs/${pack.id}/result`}
            className={buttonClassName("primary", "w-fit")}
          >
            See your result
          </Link>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- RankPlayScreen.test.tsx`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Run the type checker**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/play/RankPlayScreen.tsx src/features/play/RankPlayScreen.test.tsx
git commit -m "feat: add RankPlayScreen for the rank_blind play mechanic"
```

---

### Task 5: Wire `RankPlayScreen` into the play route

**Files:**

- Modify: `app/packs/[id]/play/page.tsx`

No test — this repo's `app/` route files are thin Server Component wrappers with no existing test precedent (`PlayPage`/`ResultPage` aren't tested directly; behavior is covered by the feature components' own tests).

- [ ] **Step 1: Add the format branch**

`app/packs/[id]/play/page.tsx` currently ends with:

```tsx
export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) notFound();

  return <PlayScreen pack={pack} />;
}
```

Change the import and final return:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import { PlayScreen } from "@/src/features/play/PlayScreen";
import { RankPlayScreen } from "@/src/features/play/RankPlayScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  return { title: pack ? `Playing ${pack.title}` : "Pack not found" };
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) notFound();

  return pack.format === "rank_blind" ? (
    <RankPlayScreen pack={pack} />
  ) : (
    <PlayScreen pack={pack} />
  );
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS (all suites)

- [ ] **Step 3: Commit**

```bash
git add "app/packs/[id]/play/page.tsx"
git commit -m "feat: route rank_blind packs to RankPlayScreen"
```

---

### Task 6: Result flow — `RankResultScreen` component

**Files:**

- Create: `src/features/result/RankResultScreen.tsx`
- Test: `src/features/result/RankResultScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/result/RankResultScreen.test.tsx`:

```tsx
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankResultScreen } from "./RankResultScreen";
import type { Pack } from "@/src/shared/types/pack";
import type { RankResults } from "@/src/shared/types/play-results";

const PACK: Pack = {
  id: "pack-rank",
  title: "Anime Openers, Ranked",
  description: "Place each pick blind into a growing ranked list.",
  coverTone: "#2b2a3a",
  format: "rank_blind",
  tags: [],
  groups: [
    {
      id: "g1",
      name: "Openers",
      selectionMode: "manual",
      items: [
        {
          id: "i1",
          type: "text",
          title: "Kaikai Kitan",
          value: "Kaikai Kitan",
        },
        { id: "i2", type: "text", title: "Redo", value: "Redo" },
      ],
    },
  ],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const RESULTS: RankResults = {
  packId: "pack-rank",
  format: "rank_blind",
  totalPlays: 2,
  rounds: [
    {
      groupId: "g1",
      groupName: "Openers",
      items: [
        {
          itemId: "i1",
          itemTitle: "Kaikai Kitan",
          timesRanked: 2,
          averagePosition: 0,
          positionCounts: [2, 0],
        },
        {
          itemId: "i2",
          itemTitle: "Redo",
          timesRanked: 2,
          averagePosition: 1,
          positionCounts: [0, 2],
        },
      ],
    },
  ],
};

beforeEach(() => {
  sessionStorage.clear();
});

describe("RankResultScreen", () => {
  it("sorts items by averagePosition (best first) and shows avg/timesRanked captions", () => {
    render(<RankResultScreen pack={PACK} results={RESULTS} />);

    const titles = screen
      .getAllByText(/Kaikai Kitan|Redo/)
      .map((el) => el.textContent);
    expect(titles).toEqual(["Kaikai Kitan", "Redo"]);
    expect(screen.getByText(/avg 0.*ranked 2x/)).toBeInTheDocument();
    expect(screen.getByText(/avg 1.*ranked 2x/)).toBeInTheDocument();
  });

  it("highlights the player's own placement and shows an agreement count", () => {
    sessionStorage.setItem(
      "velanto:last-play:pack-rank",
      JSON.stringify([{ groupId: "g1", itemId: "i1", position: 0 }]),
    );

    render(<RankResultScreen pack={PACK} results={RESULTS} />);

    expect(
      screen.getByText(/You placed this #1.*1 other play agreed/),
    ).toBeInTheDocument();
  });

  it("shows a neutral note for an item that wasn't in the player's own play", () => {
    sessionStorage.setItem(
      "velanto:last-play:pack-rank",
      JSON.stringify([{ groupId: "g1", itemId: "i1", position: 0 }]),
    );

    render(<RankResultScreen pack={PACK} results={RESULTS} />);

    expect(screen.getByText("Not in your play this round")).toBeInTheDocument();
  });

  it("shows no personal annotations when the player never played this pack", () => {
    render(<RankResultScreen pack={PACK} results={RESULTS} />);

    expect(screen.queryByText(/You placed this/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Not in your play this round"),
    ).not.toBeInTheDocument();
  });

  it("renders without crashing when there are no recorded plays yet", () => {
    const emptyResults: RankResults = {
      packId: "pack-rank",
      format: "rank_blind",
      totalPlays: 0,
      rounds: [
        {
          groupId: "g1",
          groupName: "Openers",
          items: [
            {
              itemId: "i1",
              itemTitle: "Kaikai Kitan",
              timesRanked: 0,
              averagePosition: 0,
              positionCounts: [0, 0],
            },
            {
              itemId: "i2",
              itemTitle: "Redo",
              timesRanked: 0,
              averagePosition: 0,
              positionCounts: [0, 0],
            },
          ],
        },
      ],
    };

    render(<RankResultScreen pack={PACK} results={emptyResults} />);

    expect(screen.getByText(/0 plays recorded/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- RankResultScreen.test.tsx`
Expected: FAIL — `RankResultScreen` module doesn't exist yet.

- [ ] **Step 3: Write the component**

Create `src/features/result/RankResultScreen.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { readLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import type { Pack } from "@/src/shared/types/pack";
import type {
  RankResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

export function RankResultScreen({
  pack,
  results,
}: {
  pack: Pack;
  results: RankResults;
}) {
  const [ownPicks, setOwnPicks] = useState<RecordedPick[] | null>(null);

  // sessionStorage doesn't exist during server rendering — same rationale as
  // ResultScreen's own effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnPicks(readLastPlayPicks(pack.id));
  }, [pack.id]);

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

      <div className="mb-8 flex flex-col gap-6">
        {results.rounds.map((round) => {
          const sortedItems = [...round.items].sort(
            (a, b) => a.averagePosition - b.averagePosition,
          );
          const playedThisRound =
            ownPicks?.some((pick) => pick.groupId === round.groupId) ?? false;

          return (
            <div key={round.groupId}>
              <Text className="mb-3 font-semibold">{round.groupName}</Text>
              <div className="flex flex-col gap-3">
                {sortedItems.map((item, index) => {
                  const ownPick = ownPicks?.find(
                    (pick) =>
                      pick.groupId === round.groupId &&
                      pick.itemId === item.itemId,
                  );
                  const maxCount = Math.max(...item.positionCounts, 1);

                  return (
                    <Card
                      key={item.itemId}
                      className="hover:translate-y-0 hover:shadow-none"
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold">
                          {index + 1}
                        </span>
                        <Text className="flex-1 font-semibold">
                          {item.itemTitle}
                        </Text>
                        <Text variant="tertiary" className="text-xs">
                          avg {item.averagePosition} · ranked {item.timesRanked}
                          x
                        </Text>
                      </div>
                      <div className="mb-2 flex items-end gap-1 pl-10">
                        {item.positionCounts.map((count, position) => {
                          const isOwn = ownPick?.position === position;
                          return (
                            <div
                              key={position}
                              className="flex flex-col items-center gap-1"
                            >
                              <div
                                className={
                                  isOwn
                                    ? "w-[18px] rounded-sm bg-acc ring-2 ring-white"
                                    : "w-[18px] rounded-sm bg-acc/30"
                                }
                                style={{
                                  height: `${Math.max((count / maxCount) * 32, 2)}px`,
                                }}
                              />
                              <Text variant="tertiary" className="text-[10px]">
                                #{position + 1}
                              </Text>
                            </div>
                          );
                        })}
                      </div>
                      {ownPick && ownPick.position !== undefined ? (
                        <Text className="pl-10 text-xs text-acc">
                          You placed this #{ownPick.position + 1} ·{" "}
                          {Math.max(
                            item.positionCounts[ownPick.position] - 1,
                            0,
                          )}{" "}
                          other play
                          {item.positionCounts[ownPick.position] - 1 === 1
                            ? ""
                            : "s"}{" "}
                          agreed
                        </Text>
                      ) : (
                        playedThisRound && (
                          <Text variant="tertiary" className="pl-10 text-xs">
                            Not in your play this round
                          </Text>
                        )
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href={`/packs/${pack.id}/play`}
        className={buttonClassName("primary", "w-fit")}
      >
        Play again
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- RankResultScreen.test.tsx`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Run the type checker**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/result/RankResultScreen.tsx src/features/result/RankResultScreen.test.tsx
git commit -m "feat: add RankResultScreen for rank_blind average-position results"
```

---

### Task 7: Wire `RankResultScreen` into `ResultScreen`

**Files:**

- Modify: `src/features/result/ResultScreen.tsx`
- Test: `src/features/result/ResultScreen.test.tsx`

`ResultScreen`'s existing 4 tests use a `PackResults` fixture without a `format` field — Task 1 made `format` required on `PackResults`, so those fixtures need updating in this task, alongside the existing rendering logic being renamed into an unexported `GroupResultScreen`.

- [ ] **Step 1: Update existing test fixtures and add the new dispatcher test**

In `src/features/result/ResultScreen.test.tsx`, add `format: "save_one"` to the existing `RESULTS` fixture:

```typescript
const RESULTS: PackResults = {
  packId: "pack-1",
  format: "save_one",
  totalPlays: 4,
  rounds: [
    {
      groupId: "g1",
      groupName: "2016",
      items: [
        {
          itemId: "i1",
          itemTitle: "Guren no Yumiya",
          count: 3,
          percentage: 75,
        },
        { itemId: "i2", itemTitle: "Redo", count: 1, percentage: 25 },
      ],
    },
  ],
};
```

And add `format: "save_one"` to the `emptyResults` fixture in the `"renders without crashing when the pack has no recorded plays yet"` test:

```typescript
const emptyResults: PackResults = {
  packId: "pack-1",
  format: "save_one",
  totalPlays: 0,
  rounds: [
    {
      groupId: "g1",
      groupName: "2016",
      items: [
        { itemId: "i1", itemTitle: "Guren no Yumiya", count: 0, percentage: 0 },
        { itemId: "i2", itemTitle: "Redo", count: 0, percentage: 0 },
      ],
    },
  ],
};
```

Then add a new test at the end of the `describe("ResultScreen", ...)` block:

```typescript
  it("delegates to RankResultScreen for rank_blind results", () => {
    const rankPack: Pack = { ...PACK, format: "rank_blind" };
    const rankResults: RankResults = {
      packId: "pack-1",
      format: "rank_blind",
      totalPlays: 1,
      rounds: [
        {
          groupId: "g1",
          groupName: "2016",
          items: [
            {
              itemId: "i1",
              itemTitle: "Guren no Yumiya",
              timesRanked: 1,
              averagePosition: 0,
              positionCounts: [1],
            },
          ],
        },
      ],
    };

    render(<ResultScreen pack={rankPack} results={rankResults} />);

    expect(screen.getByText(/avg 0.*ranked 1x/)).toBeInTheDocument();
  });
```

Add `RankResults` to the existing type import at the top of the file:

```typescript
import type { PackResults, RankResults } from "@/src/shared/types/play-results";
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- ResultScreen.test.tsx`
Expected: FAIL — `ResultScreen` doesn't yet accept/branch on `rank_blind` results (and the type checker would also flag `PackResults` fixtures missing `format` once Task 1 lands, if this task ran before Task 1's typecheck was clean — since Task 1 already ran its own typecheck, this file is the one place that still needs the `format` field added now).

- [ ] **Step 3: Update `ResultScreen.tsx`**

`src/features/result/ResultScreen.tsx` currently exports one function, `ResultScreen`, containing all the groups-based rendering logic. Rename that function to `GroupResultScreen` (keep it in the same file, not exported — it's an implementation detail of the dispatcher below) and add a new exported `ResultScreen` that dispatches on `results.format`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { buttonClassName } from "@/src/shared/components/Button";
import { readLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { RankResultScreen } from "@/src/features/result/RankResultScreen";
import type { Pack } from "@/src/shared/types/pack";
import type {
  PackResults,
  RankResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

export function ResultScreen({
  pack,
  results,
}: {
  pack: Pack;
  results: PackResults | RankResults;
}) {
  if (results.format === "rank_blind") {
    return <RankResultScreen pack={pack} results={results} />;
  }
  return <GroupResultScreen pack={pack} results={results} />;
}

function GroupResultScreen({
  pack,
  results,
}: {
  pack: Pack;
  results: PackResults;
}) {
  const [ownPicks, setOwnPicks] = useState<RecordedPick[] | null>(null);

  // sessionStorage doesn't exist during server rendering, so this can't be a
  // lazy useState initializer without a hydration mismatch — it must run only
  // after mount, on the client.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnPicks(readLastPlayPicks(pack.id));
  }, [pack.id]);

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

      <div className="mb-8 flex flex-col gap-4">
        {results.rounds.map((round) => {
          const ownPick = ownPicks?.find(
            (pick) => pick.groupId === round.groupId,
          );
          const ownItem = ownPick
            ? round.items.find((item) => item.itemId === ownPick.itemId)
            : undefined;

          return (
            <Card
              key={round.groupId}
              className="hover:translate-y-0 hover:shadow-none"
            >
              <Text className="mb-2 font-semibold">{round.groupName}</Text>
              {ownItem ? (
                <div className="flex items-center justify-between gap-2">
                  <Text variant="secondary" className="text-sm">
                    Your pick: {ownItem.itemTitle}
                  </Text>
                  <Text className="text-sm font-semibold text-acc">
                    {ownItem.percentage}%
                  </Text>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {round.items.map((item) => (
                    <li
                      key={item.itemId}
                      className="flex items-center justify-between gap-2"
                    >
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

      <Link
        href={`/packs/${pack.id}/play`}
        className={buttonClassName("primary", "w-fit")}
      >
        Play again
      </Link>
    </div>
  );
}
```

Note the `"use client"` directive stays at the top of the file — it applies to the whole module, covering both `ResultScreen` and `GroupResultScreen`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- ResultScreen.test.tsx`
Expected: PASS (all 6 tests, including the new dispatcher test)

- [ ] **Step 5: Run the type checker**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/result/ResultScreen.tsx src/features/result/ResultScreen.test.tsx
git commit -m "feat: dispatch rank_blind results to RankResultScreen"
```

---

### Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: PASS (all suites)

- [ ] **Step 2: Run the type checker**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors. (This command includes `--fix` — check `git diff` afterward for any unrelated formatting drift before committing, same gotcha as the backend repo.)

- [ ] **Step 4: Commit any lint-driven formatting fixes separately, if present**

```bash
git status --short
# If lint reformatted anything beyond this plan's own changes:
git add -u
git commit -m "style: lint formatting"
```

- [ ] **Step 5: Code review, manual browser verification, PR**

Not scripted here — handled by the calling process (code-reviewer subagent, then manual verification against a running `npm run dev` + the live backend, then push/PR/merge), per this repo's established workflow.

---

## Self-review

- **Spec coverage:** every section of `2026-07-06-rank-blind-frontend-design.md` maps to a task — data model (Task 1), Create (Task 3), Play (Tasks 4-5), Result (Tasks 6-7), safety nets (Task 2). Nothing in the spec is left unaddressed.
- **Placeholder scan:** none — every step has complete, runnable code or an exact command.
- **Type consistency:** `RecordedPick.position`, `RankResultItem.positionCounts`/`averagePosition`/`timesRanked`, and `RankResults.rounds[].items[]` (Task 1) are used identically in `RankPlayScreen` (Task 4, builds `RecordedPick[]` with `position`), `RankResultScreen` (Task 6, reads `positionCounts`/`averagePosition`/`timesRanked`), and `ResultScreen`'s dispatcher (Task 7, discriminates on `results.format`) — no renamed or mismatched fields across tasks.
- **Scope:** one frontend feature branch (`feature/rank-blind-frontend`), appropriately sized for its own PR — no backend changes (already shipped separately in #36).
