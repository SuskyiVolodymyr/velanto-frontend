import { describe, it, expect } from "vitest";
import {
  MODE_NAME_KEY,
  MODE_BLURB_KEY,
  MODE_ICON,
  claimVerb,
  outcomeVerb,
} from "./room-mode-copy";
import { ROOM_MODES } from "./room-types";
import { PACK_FORMATS } from "@/src/shared/types/pack";

describe("room-mode-copy", () => {
  it("has a name and blurb key for every mode", () => {
    for (const mode of ROOM_MODES) {
      expect(MODE_NAME_KEY[mode]).toBeTruthy();
      expect(MODE_BLURB_KEY[mode]).toBeTruthy();
      expect(MODE_ICON[mode]).toBeTruthy();
    }
  });

  // The engine only ever singles out the UNCLAIMED item; what it means, and
  // therefore what a claim means, is the format's to say. Getting this pair
  // the wrong way round told a sacrifice_one room to sacrifice one item per
  // player, in a format whose premise is one per round.
  it("gives the odd one out the format's own verb", () => {
    expect(outcomeVerb("save_one")).toBe("Save");
    expect(outcomeVerb("sacrifice_one")).toBe("Sacrifice");
  });

  it("makes a claim mean the OPPOSITE of the format's verb", () => {
    expect(claimVerb("save_one")).toBe("Sacrifice");
    expect(claimVerb("sacrifice_one")).toBe("Save");
  });

  it("never lets the two agree — a claim and the outcome are always opposites", () => {
    for (const format of PACK_FORMATS) {
      expect(claimVerb(format)).not.toBe(outcomeVerb(format));
    }
  });
});
