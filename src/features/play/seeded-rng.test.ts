import { describe, expect, it } from "vitest";
import { mulberry32, randomSeed } from "./seeded-rng";

describe("mulberry32", () => {
  it("returns numbers in the unit interval [0, 1)", () => {
    const rng = mulberry32(123456);
    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("is deterministic: the same seed replays the same sequence", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("gives different sequences for different seeds", () => {
    const a = Array.from({ length: 20 }, mulberry32(1));
    const b = Array.from({ length: 20 }, mulberry32(2));
    expect(a).not.toEqual(b);
  });

  it("treats the seed as a 32-bit value (>2^32 wraps identically)", () => {
    const a = Array.from({ length: 5 }, mulberry32(7));
    const b = Array.from({ length: 5 }, mulberry32(7 + 2 ** 32));
    expect(a).toEqual(b);
  });

  // Regression pin — these golden outputs freeze the exact algorithm. A stored
  // seed only replays a play if this sequence never changes, so treat the
  // algorithm as a wire contract: if this test breaks, the PRNG was altered and
  // every persisted resume seed just became meaningless. Do NOT "update" these
  // numbers to match a new implementation — restore the implementation instead.
  it("emits the pinned golden sequence for seed 1", () => {
    const rng = mulberry32(1);
    const seq = Array.from({ length: 4 }, () => rng());
    expect(seq).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
      0.9810509674716741,
    ]);
  });
});

describe("randomSeed", () => {
  it("returns a 32-bit unsigned integer", () => {
    for (let i = 0; i < 100; i++) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });
});
