import { describe, expect, it } from "vitest";
import { FORMAT_LABELS, formatLabel, getRoundsCount } from "./pack-display";
import { PACK_FORMATS, type Pack } from "@/src/shared/types/pack";

describe("formatLabel", () => {
  it("resolves every format the UI has a label for", () => {
    // Pinned individually, not looped over FORMAT_LABELS — a loop would pass
    // even if the map were emptied.
    expect(formatLabel("save_one")).toBe("Save One");
    expect(formatLabel("sacrifice_one")).toBe("Sacrifice One");
    expect(formatLabel("nxn")).toBe("NxN");
    expect(formatLabel("rank_blind")).toBe("Rank Blind");
    expect(formatLabel("1v1")).toBe("1v1");
    expect(formatLabel("save_one_friends")).toBe("Save One (Friends)");
  });

  // A format the wire names but this build has no label for still renders the
  // raw value rather than an empty cell — a labelless format is a bug to notice,
  // not to hide. (Every shipped format has a label; this guards a backend
  // deployed ahead of the frontend.)
  it("falls back to the raw wire value for an unknown format", () => {
    expect(formatLabel("telepathy" as (typeof PACK_FORMATS)[number])).toBe(
      "telepathy",
    );
    expect(FORMAT_LABELS).not.toHaveProperty("telepathy");
  });

  // `format in FORMAT_LABELS` walked the prototype chain, so these took the
  // known-label branch and returned Object.prototype METHODS typed as `string`.
  // A pack format comes off the wire, so an attacker-chosen value can reach
  // here; React would then try to render a function.
  it.each([
    "constructor",
    "toString",
    "valueOf",
    "__proto__",
    "hasOwnProperty",
  ])(
    "does not return an inherited Object.prototype member for the wire value %s",
    (hostile) => {
      const label = formatLabel(hostile as (typeof PACK_FORMATS)[number]);
      expect(typeof label).toBe("string");
      expect(label).toBe(hostile);
    },
  );

  it("labels every format in PACK_FORMATS as a non-empty string", () => {
    for (const format of PACK_FORMATS) {
      expect(formatLabel(format)).toBeTruthy();
    }
  });
});

describe("getRoundsCount", () => {
  it("counts the pack's rounds", () => {
    expect(
      getRoundsCount({ rounds: [{ id: "r1", slots: [] }] } as unknown as Pack),
    ).toBe(1);
  });

  it("returns 0 for a malformed pack with no rounds array rather than throwing", () => {
    expect(getRoundsCount({} as unknown as Pack)).toBe(0);
  });
});
