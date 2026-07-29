import { describe, it, expect } from "vitest";
import en from "./en.json";

describe("room i18n keys (2.0.0 rooms-UI plan)", () => {
  const room = en.room as Record<string, unknown>;

  it("has every new namespace this plan's tasks introduced", () => {
    for (const namespace of [
      "modePicker",
      "modes",
      "guessWho",
      "guessing",
      "identityReveal",
      "turnBasedCut",
      "voting",
      "sharedGrid",
      "relay",
      "lockedIn",
      "priority",
      "turnIndicator",
      "leaderboard",
    ]) {
      expect(room[namespace]).toBeDefined();
    }
  });

  it("has a name/blurb pair for every ROOM_MODE (matches room-mode-copy.ts's key shape)", () => {
    const modes = room.modes as Record<string, { name: string; blurb: string }>;
    for (const mode of [
      "claim",
      "guess_who",
      "turn_based_cut",
      "voting",
      "shared_grid",
      "relay",
    ]) {
      expect(modes[mode]?.name).toBeTruthy();
      expect(modes[mode]?.blurb).toBeTruthy();
    }
  });
});
