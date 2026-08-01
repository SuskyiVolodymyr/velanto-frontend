import { afterEach, describe, expect, it } from "vitest";
import { consumePlayIntent, setPlayIntent } from "./play-intent-storage";

afterEach(() => {
  sessionStorage.clear();
});

describe("play-intent-storage", () => {
  it("returns null when no intent was set", () => {
    expect(consumePlayIntent("pack-1")).toBeNull();
  });

  it("returns the set intent on the first read", () => {
    setPlayIntent("pack-1", "continue");
    expect(consumePlayIntent("pack-1")).toBe("continue");
  });

  it("is one-shot: a second read returns null", () => {
    setPlayIntent("pack-1", "restart");
    expect(consumePlayIntent("pack-1")).toBe("restart");
    expect(consumePlayIntent("pack-1")).toBeNull();
  });

  it("scopes intents per pack", () => {
    setPlayIntent("pack-a", "continue");
    setPlayIntent("pack-b", "restart");

    expect(consumePlayIntent("pack-a")).toBe("continue");
    expect(consumePlayIntent("pack-b")).toBe("restart");
  });

  it("ignores a hand-edited or corrupted value", () => {
    sessionStorage.setItem("velanto:play-intent:pack-1", "delete-everything");
    expect(consumePlayIntent("pack-1")).toBeNull();
  });
});
