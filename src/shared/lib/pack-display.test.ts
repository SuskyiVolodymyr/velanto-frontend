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
  });

  // UI-EXCLUDED:save_one_friends (velanto-frontend#368). This is the failure
  // signal for the PR that ships the format: when it gains a real label, THIS
  // expectation is what tells you to update it. Until then a moderation row
  // carrying the format must show the raw wire value, not an empty cell — the
  // pack exists (packs are authored over the API, not only via the form) and
  // hiding its format from moderators is worse than an unfamiliar string.
  it("falls back to the raw wire value for save_one_friends, which has no label", () => {
    expect(formatLabel("save_one_friends")).toBe("save_one_friends");
    expect(FORMAT_LABELS).not.toHaveProperty("save_one_friends");
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
