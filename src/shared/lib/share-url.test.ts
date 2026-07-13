import { describe, it, expect } from "vitest";
import { encodePicks, decodePicks, buildShareUrl } from "./share-url";
import type { RecordedPick } from "@/src/shared/types/play-results";

describe("share-url", () => {
  it("round-trips group picks", () => {
    const picks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "i1" },
      { roundIndex: 1, groupId: "g2", itemId: "i2" },
    ];
    expect(decodePicks(encodePicks(picks))).toEqual(picks);
  });

  it("round-trips versus picks with no itemId (a side is chosen, not an item)", () => {
    const picks: RecordedPick[] = [
      { roundIndex: 0, groupId: "ca" },
      { roundIndex: 1, groupId: "cb" },
    ];
    expect(decodePicks(encodePicks(picks))).toEqual(picks);
  });

  it("round-trips rank picks with a position field", () => {
    const picks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 },
      { roundIndex: 0, groupId: "g1", itemId: "i2", position: 1 },
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
    const picks: RecordedPick[] = [
      { roundIndex: 0, groupId: "g1", itemId: "i1" },
    ];
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
    // missing roundIndex
    expect(
      decodePicks(btoa(JSON.stringify([{ groupId: "g1", itemId: "i1" }]))),
    ).toBeNull();
    // wrong type for groupId
    expect(
      decodePicks(
        btoa(JSON.stringify([{ roundIndex: 0, groupId: 1, itemId: "i1" }])),
      ),
    ).toBeNull();
    // wrong type for itemId
    expect(
      decodePicks(
        btoa(JSON.stringify([{ roundIndex: 0, groupId: "g1", itemId: 2 }])),
      ),
    ).toBeNull();
  });

  it("rejects a negative or non-integer roundIndex or position (forged link hardening)", () => {
    const negRound = btoa(
      JSON.stringify([{ roundIndex: -1, groupId: "g1", itemId: "i1" }]),
    );
    const neg = btoa(
      JSON.stringify([
        { roundIndex: 0, groupId: "g1", itemId: "i1", position: -1 },
      ]),
    );
    const frac = btoa(
      JSON.stringify([
        { roundIndex: 0, groupId: "g1", itemId: "i1", position: 1.5 },
      ]),
    );
    expect(decodePicks(negRound)).toBeNull();
    expect(decodePicks(neg)).toBeNull();
    expect(decodePicks(frac)).toBeNull();
    // a valid non-negative integer position still decodes fine
    expect(
      decodePicks(
        encodePicks([
          { roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 },
        ]),
      ),
    ).toEqual([{ roundIndex: 0, groupId: "g1", itemId: "i1", position: 0 }]);
  });

  it("buildShareUrl appends ?p= only when picks are present and non-empty", () => {
    const withPicks = buildShareUrl("/packs/p1/result", [
      { roundIndex: 0, groupId: "g1", itemId: "i1" },
    ]);
    expect(withPicks).toContain("/packs/p1/result?p=");

    expect(buildShareUrl("/packs/p1", [])).not.toContain("?p=");
    expect(buildShareUrl("/packs/p1", null)).not.toContain("?p=");
    expect(buildShareUrl("/packs/p1")).not.toContain("?p=");
  });
});
