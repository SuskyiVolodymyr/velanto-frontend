/**
 * A pinned, deterministic pseudo-random number generator for the play-time draw.
 *
 * The single-player draw (`resolveRoundSelections`) is seeded so a play can be
 * resumed after a reload: the same seed replays the exact same rounds and drawn
 * items. That makes the SEED a persisted wire contract — it is stored in a
 * resume record and, on reopen, must reproduce the identical draw. So the
 * algorithm here is FROZEN: changing `mulberry32` (or swapping it for another
 * PRNG) silently invalidates every stored seed, turning a resumed play into a
 * different game. If you think you need to change it, you need a new function
 * and a versioned seed instead. See seeded-rng.test.ts for the golden-value pin.
 *
 * mulberry32 is a well-known fast 32-bit generator with a 2^32 period — more
 * than enough for a single pack's draw, and chosen for being tiny, dependency-
 * free, and easy to reproduce exactly.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A fresh 32-bit seed for a new play. Randomness quality doesn't matter here —
 * this only needs to differ between plays so two runs of the same pack draw
 * differently; `Math.random` is plenty. Kept out of `mulberry32` so the seed
 * source (non-deterministic) and the generator (deterministic) stay separate.
 */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
