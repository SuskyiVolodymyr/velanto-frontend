import { afterEach, describe, expect, it } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePlayResume } from "./use-play-resume";
import { packStructureHash } from "./pack-structure-hash";
import {
  readPlayResume,
  writePlayResume,
} from "./play-resume-storage";
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
});

describe("usePlayResume", () => {
  it("mints a fresh seed and zero progress when there is no saved play", async () => {
    const { result } = renderHook(() => usePlayResume(makePack()));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(typeof result.current.seed).toBe("number");
    expect(result.current.initialRoundIndex).toBe(0);
    expect(result.current.initialChoices).toBeNull();
  });

  it("restores seed, round index, and choices from a matching saved record", async () => {
    const pack = makePack();
    const version = packStructureHash(pack);
    writePlayResume({
      packId: pack.id,
      seed: 777,
      packVersion: version,
      roundIndex: 1,
      choices: [{ roundIndex: 0, itemId: "1" }],
      updatedAt: Date.now(),
    });

    const { result } = renderHook(() => usePlayResume(pack));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.seed).toBe(777);
    expect(result.current.initialRoundIndex).toBe(1);
    expect(result.current.initialChoices).toEqual([
      { roundIndex: 0, itemId: "1" },
    ]);
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
      updatedAt: Date.now(),
    });

    const { result } = renderHook(() => usePlayResume(pack));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.seed).not.toBe(777);
    expect(result.current.initialRoundIndex).toBe(0);
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
});
