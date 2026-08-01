import { describe, it, expect } from "vitest";
import en from "./en.json";
import zh from "./zh.json";
import hi from "./hi.json";
import ar from "./ar.json";
import bn from "./bn.json";
import ru from "./ru.json";
import ur from "./ur.json";
import uk from "./uk.json";

const room = en.room as Record<string, unknown>;

const OTHER_LOCALE_CATALOGS: Record<string, Record<string, unknown>> = {
  zh,
  hi,
  ar,
  bn,
  ru,
  ur,
  uk,
};

const NEW_NAMESPACES = [
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
];

describe("room i18n keys (2.0.0 rooms-UI plan)", () => {
  it("has every new namespace this plan's tasks introduced", () => {
    for (const namespace of NEW_NAMESPACES) {
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

describe("room i18n keys exist in every locale catalog", () => {
  for (const [locale, catalog] of Object.entries(OTHER_LOCALE_CATALOGS)) {
    it(`messages/${locale}.json has every new room namespace`, () => {
      const localeRoom = catalog.room as Record<string, unknown> | undefined;
      expect(localeRoom).toBeDefined();
      for (const namespace of NEW_NAMESPACES) {
        expect(localeRoom![namespace]).toBeDefined();
      }
    });

    it(`messages/${locale}.json's round/between/presence keys are migrated to the Save/Sacrifice pair (no stale singular keys)`, () => {
      const localeRoom = catalog.room as {
        round: Record<string, unknown>;
        between: Record<string, unknown>;
        presence: Record<string, unknown>;
      };
      expect(localeRoom.round.instructionSave).toBeTruthy();
      expect(localeRoom.round.instructionSacrifice).toBeTruthy();
      // No Save half for the CLAIM itself: a claim is a sacrifice in both
      // formats (claim.engine.ts), so `claimSave`/`claimedBySave` were dead
      // copy that read as the opposite game. The pairs below are about the
      // SURVIVOR, which the pack's format does still name.
      expect(localeRoom.round.claimSave).toBeUndefined();
      expect(localeRoom.round.claimedBySave).toBeUndefined();
      expect(localeRoom.round.claimSacrifice).toBeTruthy();
      expect(localeRoom.round.claimedBySacrifice).toBeTruthy();
      expect(localeRoom.round.survivorSave).toBeTruthy();
      expect(localeRoom.round.survivorSacrifice).toBeTruthy();
      expect(localeRoom.round.tooFastNote).toBeTruthy();
      expect(localeRoom.round.instruction).toBeUndefined();
      expect(localeRoom.round.claim).toBeUndefined();
      expect(localeRoom.round.sacrificedBy).toBeUndefined();
      expect(localeRoom.round.survivor).toBeUndefined();
      expect(localeRoom.between.survivorHeadingSave).toBeTruthy();
      expect(localeRoom.between.survivorHeadingSacrifice).toBeTruthy();
      expect(localeRoom.between.survivorNoteSave).toBeTruthy();
      expect(localeRoom.between.survivorNoteSacrifice).toBeTruthy();
      expect(localeRoom.between.boardHeadingSave).toBeTruthy();
      expect(localeRoom.between.boardHeadingSacrifice).toBeTruthy();
      expect(localeRoom.between.survivorHeading).toBeUndefined();
      expect(localeRoom.between.survivorNote).toBeUndefined();
      expect(localeRoom.between.boardHeading).toBeUndefined();
      expect(localeRoom.presence.playerCount).toBeTruthy();
      expect(localeRoom.presence.label).toBeUndefined();
    });
  }
});
