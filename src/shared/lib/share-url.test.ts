import { describe, it, expect } from "vitest";
import { encodePicks, decodePicks, buildShareUrl } from "./share-url";
import type { RecordedPick } from "@/src/shared/types/play-results";

describe("share-url", () => {
  it("round-trips group picks", () => {
    const picks: RecordedPick[] = [
      { groupId: "g1", itemId: "i1" },
      { groupId: "g2", itemId: "i2" },
    ];
    expect(decodePicks(encodePicks(picks))).toEqual(picks);
  });

  it("round-trips rank picks with a position field", () => {
    const picks: RecordedPick[] = [
      { groupId: "g1", itemId: "i1", position: 0 },
      { groupId: "g1", itemId: "i2", position: 1 },
    ];
    expect(decodePicks(encodePicks(picks))).toEqual(picks);
  });

  it("produces a URL-safe code (no +, /, or = characters)", () => {
    const picks: RecordedPick[] = Array.from({ length: 8 }, (_, n) => ({
      groupId: `group-${n}`,
      itemId: `item-${n}`,
    }));
    const code = encodePicks(picks);
    expect(code).not.toMatch(/[+/=]/);
  });

  it("returns null for malformed codes rather than throwing", () => {
    expect(decodePicks("")).toBeNull();
    expect(decodePicks("!!!not base64!!!")).toBeNull();
    expect(decodePicks(btoa("not json"))).toBeNull();
    expect(decodePicks(btoa(JSON.stringify({ not: "an array" })))).toBeNull();
    expect(decodePicks(btoa(JSON.stringify([{ groupId: "g1" }])))).toBeNull(); // missing itemId
    expect(decodePicks(btoa(JSON.stringify([{ groupId: 1, itemId: "i1" }])))).toBeNull(); // wrong type
  });

  it("buildShareUrl appends ?p= only when picks are present and non-empty", () => {
    const withPicks = buildShareUrl("/packs/p1/result", [{ groupId: "g1", itemId: "i1" }]);
    expect(withPicks).toContain("/packs/p1/result?p=");

    expect(buildShareUrl("/packs/p1", [])).not.toContain("?p=");
    expect(buildShareUrl("/packs/p1", null)).not.toContain("?p=");
    expect(buildShareUrl("/packs/p1")).not.toContain("?p=");
  });
});
