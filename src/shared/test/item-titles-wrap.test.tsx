import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * velanto-frontend#442 — a pack item's title must be readable in full wherever
 * it is shown.
 *
 * Every surface below used to ellipsise or line-clamp it, so an author who
 * wrote a real sentence saw the first line or two and no way to reach the rest.
 * The worst case was the solo elimination card, which clamped to two lines
 * under a 16:9 tile that renders nothing at all for a text item.
 *
 * This is a source-level guard on purpose. Clamping is CSS — jsdom computes no
 * layout, so no rendered assertion can tell a clamped title from a wrapped one,
 * and the class IS the behaviour here. It's coarse (a file could clamp some
 * OTHER string and still pass) but it catches the actual regression: someone
 * reaching for `truncate` on a title again, in the file where it happened.
 *
 * `break-words` rather than nothing: without it a single long unbroken word
 * (a URL, a hashtag) overflows its column instead of wrapping.
 *
 * NOT covered, deliberately: player names, pack titles, and the admin and
 * moderation tables. There a row is one line with figures aligned beside it,
 * and truncation is the design rather than a limitation.
 */
const SURFACES = [
  // Solo play
  "src/features/play/CandidateCard.tsx",
  "src/features/play/RankPlayScreen.tsx",
  // Room boards
  "src/features/friends-rooms/BlindRankBoard.tsx",
  "src/features/friends-rooms/RelayInsertBoard.tsx",
  "src/features/friends-rooms/TurnBasedCutBoard.tsx",
  "src/features/friends-rooms/VotingBoard.tsx",
  "src/features/friends-rooms/SpyBoard.tsx",
  "src/features/friends-rooms/SpyRedactedTile.tsx",
  // Results and history
  "src/features/friends-rooms/RevealRankingTable.tsx",
  "src/features/result/NxNResultScreen.tsx",
  "src/features/pack/PackTopItemsList.tsx",
  "src/shared/components/RankedList.tsx",
  // Carries ITEM titles in the Top picked boards, not just player names.
  "src/shared/components/BoardCard.tsx",
];

describe("item titles are never clamped", () => {
  it.each(SURFACES)("%s does not clamp or ellipsise", (file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    // Strip comments — several of these files explain the old `truncate`
    // behaviour in prose, and that prose is not a violation.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/\btruncate\b/);
    expect(code).not.toMatch(/\bline-clamp-\d/);
  });

  // The one place the fix is most visible: the card is mostly empty tile for a
  // text item, so the title strip is the whole content.
  it("gives the elimination card's title a floor, not a fixed height", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/play/CandidateCard.tsx"),
      "utf8",
    );
    expect(source).toContain("min-h-[2.6em]");
    expect(source).toContain("break-words");
  });
});
