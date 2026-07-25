import { afterEach, describe, expect, it } from "vitest";
import {
  MAX_RESUME_RECORDS,
  RESUME_TTL_MS,
  deletePlayResume,
  listPlayResumes,
  readPlayResume,
  writePlayResume,
  type PlayResumeRecord,
} from "./play-resume-storage";

function record(over: Partial<PlayResumeRecord> = {}): PlayResumeRecord {
  return {
    packId: "p1",
    seed: 12345,
    packVersion: "v1",
    roundIndex: 2,
    choices: [{ roundIndex: 0, itemId: "x" }],
    // Fresh by default so the record isn't pruned by the TTL; tests that care
    // about ordering/expiry pass an explicit updatedAt.
    updatedAt: Date.now(),
    ...over,
  };
}

afterEach(() => {
  localStorage.clear();
});

describe("play-resume-storage", () => {
  it("round-trips a record by packId and matching version", () => {
    const rec = record();
    writePlayResume(rec);
    expect(readPlayResume("p1", "v1")).toEqual(rec);
  });

  it("returns null when there is no record for the pack", () => {
    expect(readPlayResume("missing", "v1")).toBeNull();
  });

  it("drops and returns null on a version mismatch (author edited the pack)", () => {
    writePlayResume(record({ packVersion: "v1" }));
    expect(readPlayResume("p1", "v2")).toBeNull();
    // The stale record is deleted, not just skipped.
    expect(readPlayResume("p1", "v1")).toBeNull();
  });

  it("drops and returns null for an expired record (older than the TTL)", () => {
    const stale = Date.now() - RESUME_TTL_MS - 1;
    writePlayResume(record({ updatedAt: stale }));
    expect(readPlayResume("p1", "v1")).toBeNull();
  });

  it("keeps a record that is within the TTL", () => {
    const fresh = Date.now() - RESUME_TTL_MS + 60_000;
    writePlayResume(record({ updatedAt: fresh }));
    expect(readPlayResume("p1", "v1")).not.toBeNull();
  });

  it("deletePlayResume removes the record", () => {
    writePlayResume(record());
    deletePlayResume("p1");
    expect(readPlayResume("p1", "v1")).toBeNull();
  });

  it("overwrites the same pack's record without spawning a second entry", () => {
    const now = Date.now();
    writePlayResume(record({ roundIndex: 1, updatedAt: now }));
    writePlayResume(record({ roundIndex: 3, updatedAt: now + 1 }));
    expect(listPlayResumes()).toHaveLength(1);
    expect(readPlayResume("p1", "v1")?.roundIndex).toBe(3);
  });

  it("lists valid records most-recently-updated first, pruning expired ones", () => {
    const now = Date.now();
    writePlayResume(record({ packId: "a", updatedAt: now - 1000 }));
    writePlayResume(record({ packId: "b", updatedAt: now - 100 }));
    writePlayResume(
      record({ packId: "old", updatedAt: now - RESUME_TTL_MS - 1 }),
    );
    const ids = listPlayResumes().map((r) => r.packId);
    expect(ids).toEqual(["b", "a"]);
  });

  it("rejects a malformed record with a non-numeric updatedAt (no NaN leak)", () => {
    // A hand-edited/schema-drifted entry: valid JSON, but updatedAt is not a
    // number. Left unguarded this poisons the TTL (now - NaN is never > TTL) and
    // the freshest-first sort. It must be treated as absent.
    localStorage.setItem(
      "velanto:play-resume:bad",
      JSON.stringify({
        packId: "bad",
        seed: 1,
        packVersion: "v1",
        roundIndex: 0,
        choices: null,
        updatedAt: "oops",
      }),
    );
    expect(readPlayResume("bad", "v1")).toBeNull();
    expect(listPlayResumes()).toHaveLength(0);
  });

  it("caps uncompleted packs, evicting the least-recently-played on overflow", () => {
    // Fill to the cap with distinct, increasingly-recent packs.
    const now = Date.now();
    for (let i = 0; i < MAX_RESUME_RECORDS; i++) {
      writePlayResume(record({ packId: `pack${i}`, updatedAt: now + i }));
    }
    expect(listPlayResumes()).toHaveLength(MAX_RESUME_RECORDS);

    // A new (cap+1)th pack evicts pack0 (the oldest updatedAt).
    writePlayResume(record({ packId: "newest", updatedAt: now + 999 }));
    const ids = listPlayResumes().map((r) => r.packId);
    expect(ids).toHaveLength(MAX_RESUME_RECORDS);
    expect(ids).toContain("newest");
    expect(ids).not.toContain("pack0");
  });
});
