import { describe, it, expect } from "vitest";
import {
  MODE_NAME_KEY,
  MODE_BLURB_KEY,
  MODE_ICON,
  claimVerbKey,
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

  it("claimVerbKey flips between save_one and sacrifice_one", () => {
    expect(claimVerbKey("save_one")).toBe("claimVerbSave");
    expect(claimVerbKey("sacrifice_one")).toBe("claimVerbSacrifice");
  });

  it("claimVerbKey is total over every PackFormat (exhaustiveness)", () => {
    for (const format of PACK_FORMATS) {
      expect(() => claimVerbKey(format)).not.toThrow();
    }
  });
});
