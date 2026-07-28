import { describe, expect, it } from "vitest";
import { summarizeResult } from "@/src/features/result/result-summary";
import type {
  PackResults,
  RankResults,
  RecordedPick,
} from "@/src/shared/types/play-results";

function packResults(over: Partial<PackResults>): PackResults {
  return {
    packId: "pack-1",
    format: "save_one",
    totalPlays: 40,
    rounds: [],
    ...over,
  };
}

function rankResults(over: Partial<RankResults>): RankResults {
  return {
    packId: "pack-1",
    format: "rank_blind",
    totalPlays: 40,
    rounds: [],
    ...over,
  };
}

describe("summarizeResult", () => {
  // save_one / sacrifice_one / 1v1 share this branch — one representative
  // case covers all three (per T10's brief).
  it("save_one: joins ownPicks against topItems and reports agreement + top/rare picks in picked/appeared terms, never count/totalPlays", () => {
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "poster-a", chosen: true },
      { roundIndex: 0, groupId: "g1", itemId: "poster-b", chosen: false },
      { roundIndex: 1, groupId: "g1", itemId: "poster-c", chosen: true },
    ];
    const results = packResults({
      format: "save_one",
      topItems: [
        {
          itemId: "poster-a",
          itemTitle: "Poster A",
          picked: 30,
          appeared: 40,
          percentage: 75,
        },
        {
          itemId: "poster-c",
          itemTitle: "Poster C",
          picked: 5,
          appeared: 20,
          percentage: 25,
        },
        // Never chosen by this player — must not affect the mean.
        {
          itemId: "poster-d",
          itemTitle: "Poster D",
          picked: 0,
          appeared: 10,
          percentage: 0,
        },
      ],
    });

    const { tiles } = summarizeResult({
      format: "save_one",
      ownPicks,
      results,
    });

    expect(tiles).toEqual([
      { kind: "percent", labelKey: "result.statAgreement", value: 50 },
      {
        kind: "pick",
        labelKey: "result.statTopPick",
        title: "Poster A",
        percent: 75,
      },
      {
        kind: "pick",
        labelKey: "result.statRarePick",
        title: "Poster C",
        percent: 25,
      },
    ]);
  });

  it("nxn: three counts, never a percentage tile (#333)", () => {
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "boys", itemId: "poster-a", chosen: true },
      { roundIndex: 0, groupId: "boys", itemId: "poster-b", chosen: false },
      { roundIndex: 0, groupId: "girls", itemId: "poster-c", chosen: false },
      { roundIndex: 1, groupId: "boys", itemId: "poster-d", chosen: true },
    ];
    const results = packResults({ format: "nxn", totalPlays: 12 });

    const { tiles } = summarizeResult({ format: "nxn", ownPicks, results });

    expect(tiles).toEqual([
      { kind: "count", labelKey: "result.statPlays", value: 12 },
      { kind: "count", labelKey: "result.statRoundsPlayed", value: 2 },
      { kind: "count", labelKey: "result.statItemsSeen", value: 4 },
    ]);
    expect(tiles.some((tile) => tile.kind === "percent")).toBe(false);
  });

  it("rank_blind: three counts derived from placements + podium, no agreement tile", () => {
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "song-a", position: 0 },
      { roundIndex: 0, groupId: "g1", itemId: "song-b", position: 1 },
      { roundIndex: 1, groupId: "g2", itemId: "song-c", position: 0 },
    ];
    const results = rankResults({
      podium: [
        { itemId: "song-a", itemTitle: "Song A", first: 5, second: 1, third: 0, total: 6 },
        { itemId: "song-c", itemTitle: "Song C", first: 2, second: 0, third: 1, total: 3 },
      ],
    });

    const { tiles } = summarizeResult({
      format: "rank_blind",
      ownPicks,
      results,
    });

    expect(tiles).toEqual([
      { kind: "count", labelKey: "result.statRoundsRanked", value: 2 },
      { kind: "count", labelKey: "result.statItemsPlaced", value: 3 },
      { kind: "count", labelKey: "result.statPodiumEntries", value: 2 },
    ]);
  });

  it("returns no tiles when the join between ownPicks and topItems matches nothing", () => {
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "poster-z", chosen: true },
    ];
    const results = packResults({
      format: "save_one",
      topItems: [
        {
          itemId: "poster-a",
          itemTitle: "Poster A",
          picked: 30,
          appeared: 40,
          percentage: 75,
        },
      ],
    });

    expect(
      summarizeResult({ format: "save_one", ownPicks, results }).tiles,
    ).toEqual([]);
  });

  it("returns no tiles when topItems is empty", () => {
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "poster-a", chosen: true },
    ];
    const results = packResults({ format: "save_one", topItems: [] });

    expect(
      summarizeResult({ format: "save_one", ownPicks, results }).tiles,
    ).toEqual([]);
  });

  it("returns no tiles when ownPicks is empty", () => {
    const results = packResults({
      format: "save_one",
      topItems: [
        {
          itemId: "poster-a",
          itemTitle: "Poster A",
          picked: 30,
          appeared: 40,
          percentage: 75,
        },
      ],
    });

    expect(
      summarizeResult({ format: "save_one", ownPicks: [], results }).tiles,
    ).toEqual([]);
    expect(
      summarizeResult({ format: "save_one", ownPicks: null, results }).tiles,
    ).toEqual([]);
  });

  // Single-pick edge case: topPick and rarestPick would name the same item
  // under two different labels. Only the "top pick" tile is shown — see the
  // comment in result-summary.ts on why that one survives alone.
  it("shows only the top-pick tile, not a duplicate rare-pick tile, when only one pick joins", () => {
    const ownPicks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "poster-a", chosen: true },
    ];
    const results = packResults({
      format: "sacrifice_one",
      topItems: [
        {
          itemId: "poster-a",
          itemTitle: "Poster A",
          picked: 12,
          appeared: 16,
          percentage: 75,
        },
      ],
    });

    const { tiles } = summarizeResult({
      format: "sacrifice_one",
      ownPicks,
      results,
    });

    expect(tiles).toEqual([
      { kind: "percent", labelKey: "result.statAgreement", value: 75 },
      {
        kind: "pick",
        labelKey: "result.statTopPick",
        title: "Poster A",
        percent: 75,
      },
    ]);
    expect(tiles.some((tile) => tile.labelKey === "result.statRarePick")).toBe(
      false,
    );
  });

  // NOTE for T11: a `shared` viewer (looking at someone else's shared-link
  // result) needs different LABEL TEXT for these same tiles ("the sharer's
  // agreement" vs "your agreement") — that distinction is resolved by which
  // i18n key each `labelKey` string resolves to, chosen by the caller/T11,
  // not by this module. `summarizeResult` takes no `shared` flag on purpose:
  // the numbers themselves don't change based on who's viewing, only the
  // copy around them does, so nothing here needs to special-case it.
});
