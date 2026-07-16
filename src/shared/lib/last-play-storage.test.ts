import { afterEach, describe, expect, it, vi } from "vitest";
import { readLastPlayPicks, writeLastPlayPicks } from "./last-play-storage";

const PICKS = [{ roundIndex: 0, groupId: "g1", itemId: "i1" }];

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("last-play storage", () => {
  it("round-trips picks through sessionStorage", () => {
    writeLastPlayPicks("pack-1", PICKS);
    expect(readLastPlayPicks("pack-1")).toEqual(PICKS);
  });

  it("returns null for a pack that was never played", () => {
    expect(readLastPlayPicks("never-played")).toBeNull();
  });

  // A distinct pack id per test on purpose: the in-memory fallback is
  // module-level and deliberately has no reset hook (production code should not
  // grow test-only API), so reusing an id would read a previous test's picks.
  it("returns null rather than throwing on a corrupt entry", () => {
    sessionStorage.setItem("velanto:last-play:pack-corrupt", "{not json");
    expect(readLastPlayPicks("pack-corrupt")).toBeNull();
  });

  // These picks are load-bearing since #222: the result screen is gated on
  // them. Before the gate, losing them cost a "your pick" highlight; now it
  // costs the player the entire result screen right after they finished. So a
  // storage failure must not be fatal — Safari private mode, a blocked-storage
  // context and a quota error all throw from setItem.
  describe("when sessionStorage is unavailable", () => {
    it("does not throw, and still reports the play as played", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

      expect(() => writeLastPlayPicks("pack-blocked", PICKS)).not.toThrow();
      expect(readLastPlayPicks("pack-blocked")).toEqual(PICKS);
    });

    it("falls back to memory when reading throws too", () => {
      writeLastPlayPicks("pack-2", PICKS);
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("SecurityError");
      });

      expect(readLastPlayPicks("pack-2")).toEqual(PICKS);
    });

    it("still isolates packs from each other", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

      writeLastPlayPicks("pack-a", PICKS);
      expect(readLastPlayPicks("pack-b")).toBeNull();
    });
  });
});
