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

  it("round-trips an empty pick list", () => {
    expect(decodePicks(encodePicks([]))).toEqual([]);
  });

  it("produces a URL-safe code (no +, /, or = characters)", () => {
    // Chosen so the RAW base64 actually contains `=` padding — this proves the
    // fixture is non-trivial and forces the assertion below to genuinely
    // exercise encodePicks's substitutions. Without the raw guard, a fixture
    // that already yielded clean base64 would make the test vacuously pass even
    // if encodePicks dropped its `.replace()` calls.
    const picks: RecordedPick[] = [{ groupId: "g1", itemId: "i1" }];
    const raw = btoa(JSON.stringify(picks));
    expect(raw).toMatch(/[+/=]/);

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

  it("rejects a negative or non-integer position (forged link hardening)", () => {
    const neg = btoa(JSON.stringify([{ groupId: "g1", itemId: "i1", position: -1 }]));
    const frac = btoa(JSON.stringify([{ groupId: "g1", itemId: "i1", position: 1.5 }]));
    expect(decodePicks(neg)).toBeNull();
    expect(decodePicks(frac)).toBeNull();
    // a valid non-negative integer position still decodes fine
    expect(decodePicks(encodePicks([{ groupId: "g1", itemId: "i1", position: 0 }]))).toEqual([
      { groupId: "g1", itemId: "i1", position: 0 },
    ]);
  });

  it("buildShareUrl appends ?p= only when picks are present and non-empty", () => {
    const withPicks = buildShareUrl("/packs/p1/result", [{ groupId: "g1", itemId: "i1" }]);
    expect(withPicks).toContain("/packs/p1/result?p=");

    expect(buildShareUrl("/packs/p1", [])).not.toContain("?p=");
    expect(buildShareUrl("/packs/p1", null)).not.toContain("?p=");
    expect(buildShareUrl("/packs/p1")).not.toContain("?p=");
  });
});
