import { afterEach, describe, expect, it } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePlayResume } from "./use-play-resume";
import { packStructureHash } from "./pack-structure-hash";
import { readPlayResume, writePlayResume } from "./play-resume-storage";
import { setPlayIntent } from "./play-intent-storage";
import type { Pack } from "@/src/shared/types/pack";

function makePack(over: Partial<Pack> = {}): Pack {
  return {
    id: "pack-1",
    title: "Test Pack",
    description: "",
    coverTone: "#2b2a3a",
    format: "save_one",
    language: "en",
    tags: [],
    groups: [
      {
        id: "g1",
        name: "Pool",
        items: [
          { id: "1", type: "text", title: "A", value: "A" },
          { id: "2", type: "text", title: "B", value: "B" },
          { id: "3", type: "text", title: "C", value: "C" },
        ],
      },
    ],
    rounds: [
      { id: "r1", slots: [{ groupId: "g1", mode: "random", count: 1 }] },
      { id: "r2", slots: [{ groupId: "g1", mode: "random", count: 1 }] },
    ],
    authorId: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    totalPlays: 0,
    avgAgreementPercent: 0,
    status: "approved",
    rejectionReason: null,
    score: 0,
    likes: 0,
    dislikes: 0,
    myVote: null,
    ...over,
  };
}

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("usePlayResume", () => {
  it("mints a fresh seed and zero progress when there is no saved play", async () => {
    const { result } = renderHook(() => usePlayResume(makePack()));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(typeof result.current.seed).toBe("number");
    expect(result.current.initialRoundIndex).toBe(0);
    expect(result.current.initialChoices).toBeNull();
    // Nothing to choose between on a fresh play — the gate never engages.
    expect(result.current.needsChoice).toBe(false);
  });

  it("withholds the seed and asks for a decision when a saved play is found", async () => {
    const pack = makePack();
    const version = packStructureHash(pack);
    writePlayResume({
      packId: pack.id,
      seed: 777,
      packVersion: version,
      roundIndex: 1,
      choices: [{ roundIndex: 0, itemId: "1" }],
      pack: { title: pack.title, coverTone: pack.coverTone, totalRounds: 2 },
      updatedAt: Date.now(),
    });

    const { result } = renderHook(() => usePlayResume(pack));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.needsChoice).toBe(true);
    // Withheld, not just unset: useRoundSelections draws as soon as it sees a
    // non-null seed, and its draw is one-shot — exposing the saved seed before
    // a decision would let a later Restart's fresh seed arrive too late to
    // matter.
    expect(result.current.seed).toBeNull();
  });

  it("chooseContinue resolves to the saved seed, round index, and choices", async () => {
    const pack = makePack();
    const version = packStructureHash(pack);
    writePlayResume({
      packId: pack.id,
      seed: 777,
      packVersion: version,
      roundIndex: 1,
      choices: [{ roundIndex: 0, itemId: "1" }],
      pack: { title: pack.title, coverTone: pack.coverTone, totalRounds: 2 },
      updatedAt: Date.now(),
    });

    const { result } = renderHook(() => usePlayResume(pack));
    await waitFor(() => expect(result.current.needsChoice).toBe(true));

    act(() => result.current.chooseContinue());

    expect(result.current.needsChoice).toBe(false);
    expect(result.current.seed).toBe(777);
    expect(result.current.initialRoundIndex).toBe(1);
    expect(result.current.initialChoices).toEqual([
      { roundIndex: 0, itemId: "1" },
    ]);
    // A decision, not a rewrite — the saved record is untouched until the
    // play itself next saves or completes.
    expect(readPlayResume(pack.id, version)?.seed).toBe(777);
  });

  it("chooseRestart discards the saved play and mints a new seed from round 0", async () => {
    const pack = makePack();
    const version = packStructureHash(pack);
    writePlayResume({
      packId: pack.id,
      seed: 777,
      packVersion: version,
      roundIndex: 1,
      choices: [{ roundIndex: 0, itemId: "1" }],
      pack: { title: pack.title, coverTone: pack.coverTone, totalRounds: 2 },
      updatedAt: Date.now(),
    });

    const { result } = renderHook(() => usePlayResume(pack));
    await waitFor(() => expect(result.current.needsChoice).toBe(true));

    act(() => result.current.chooseRestart());

    expect(result.current.needsChoice).toBe(false);
    expect(typeof result.current.seed).toBe("number");
    expect(result.current.seed).not.toBe(777);
    expect(result.current.initialRoundIndex).toBe(0);
    expect(result.current.initialChoices).toBeNull();
    // The old record is gone outright, not just superseded in memory — a
    // reload before any new progress must not re-offer the discarded play.
    expect(readPlayResume(pack.id, version)).toBeNull();
  });

  it("ignores a saved record from a since-edited pack and mints a fresh seed", async () => {
    const pack = makePack();
    // A record saved against a DIFFERENT structure version (author has edited).
    writePlayResume({
      packId: pack.id,
      seed: 777,
      packVersion: "stale-version",
      roundIndex: 1,
      choices: [{ roundIndex: 0, itemId: "1" }],
      pack: { title: pack.title, coverTone: pack.coverTone, totalRounds: 2 },
      updatedAt: Date.now(),
    });

    const { result } = renderHook(() => usePlayResume(pack));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.seed).not.toBe(777);
    expect(result.current.initialRoundIndex).toBe(0);
    // An invalidated record is exactly a fresh play — no decision to offer.
    expect(result.current.needsChoice).toBe(false);
  });

  it("saveProgress persists a record readable at the current version", async () => {
    const pack = makePack();
    const { result } = renderHook(() => usePlayResume(pack));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const seed = result.current.seed;

    act(() => {
      result.current.saveProgress(1, [{ roundIndex: 0, itemId: "2" }]);
    });

    const stored = readPlayResume(pack.id, packStructureHash(pack));
    expect(stored).not.toBeNull();
    expect(stored?.seed).toBe(seed);
    expect(stored?.roundIndex).toBe(1);
    expect(stored?.choices).toEqual([{ roundIndex: 0, itemId: "2" }]);
    // The pack display snapshot is written for the Continue-playing rail.
    expect(stored?.pack).toEqual({
      title: "Test Pack",
      // Snapshotted alongside the tone so the Continue-playing rail shows the
      // pack's real cover; null for a pack that has none.
      coverImageKey: null,
      coverTone: "#2b2a3a",
      totalRounds: 2,
    });
  });

  it("clearProgress deletes the saved record", async () => {
    const pack = makePack();
    const { result } = renderHook(() => usePlayResume(pack));
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.saveProgress(1, []));
    expect(readPlayResume(pack.id, packStructureHash(pack))).not.toBeNull();

    act(() => result.current.clearProgress());
    expect(readPlayResume(pack.id, packStructureHash(pack))).toBeNull();
  });

  describe("one-shot navigation intent", () => {
    it("a 'continue' intent resumes silently — no needsChoice gate", async () => {
      const pack = makePack();
      const version = packStructureHash(pack);
      writePlayResume({
        packId: pack.id,
        seed: 777,
        packVersion: version,
        roundIndex: 1,
        choices: [{ roundIndex: 0, itemId: "1" }],
        pack: { title: pack.title, coverTone: pack.coverTone, totalRounds: 2 },
        updatedAt: Date.now(),
      });
      setPlayIntent(pack.id, "continue");

      const { result } = renderHook(() => usePlayResume(pack));

      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.needsChoice).toBe(false);
      expect(result.current.seed).toBe(777);
      expect(result.current.initialRoundIndex).toBe(1);
      expect(result.current.initialChoices).toEqual([
        { roundIndex: 0, itemId: "1" },
      ]);
    });

    it("a 'restart' intent discards the saved play and mints a new seed silently", async () => {
      const pack = makePack();
      const version = packStructureHash(pack);
      writePlayResume({
        packId: pack.id,
        seed: 777,
        packVersion: version,
        roundIndex: 1,
        choices: [{ roundIndex: 0, itemId: "1" }],
        pack: { title: pack.title, coverTone: pack.coverTone, totalRounds: 2 },
        updatedAt: Date.now(),
      });
      setPlayIntent(pack.id, "restart");

      const { result } = renderHook(() => usePlayResume(pack));

      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.needsChoice).toBe(false);
      expect(typeof result.current.seed).toBe("number");
      expect(result.current.seed).not.toBe(777);
      expect(result.current.initialRoundIndex).toBe(0);
      expect(result.current.initialChoices).toBeNull();
      expect(readPlayResume(pack.id, version)).toBeNull();
    });

    it("the intent is consumed once — a fresh mount (a refresh) with no new intent falls back to asking", async () => {
      const pack = makePack();
      const version = packStructureHash(pack);
      writePlayResume({
        packId: pack.id,
        seed: 777,
        packVersion: version,
        roundIndex: 1,
        choices: [{ roundIndex: 0, itemId: "1" }],
        pack: { title: pack.title, coverTone: pack.coverTone, totalRounds: 2 },
        updatedAt: Date.now(),
      });
      setPlayIntent(pack.id, "continue");

      const first = renderHook(() => usePlayResume(pack));
      await waitFor(() => expect(first.result.current.needsChoice).toBe(false));
      first.unmount();

      // Simulates a page refresh of the destination: same pack, same saved
      // record, but the click handler that set the intent never re-runs.
      const second = renderHook(() => usePlayResume(pack));
      await waitFor(() => expect(second.result.current.ready).toBe(true));
      expect(second.result.current.needsChoice).toBe(true);
      expect(second.result.current.seed).toBeNull();
    });

    it("a 'restart' intent with no saved play is just a normal fresh play", async () => {
      const pack = makePack();
      setPlayIntent(pack.id, "restart");

      const { result } = renderHook(() => usePlayResume(pack));

      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.needsChoice).toBe(false);
      expect(typeof result.current.seed).toBe("number");
      expect(result.current.initialRoundIndex).toBe(0);
    });
  });
});
