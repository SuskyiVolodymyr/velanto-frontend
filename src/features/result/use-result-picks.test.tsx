import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useResultPicks } from "./use-result-picks";
import { encodePicks } from "@/src/shared/lib/share-url";
import { readLastPlayPicks } from "@/src/shared/lib/last-play-storage";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));
vi.mock("@/src/shared/lib/last-play-storage");

beforeEach(() => {
  searchParams = new URLSearchParams();
  vi.mocked(readLastPlayPicks).mockReset();
});

describe("useResultPicks", () => {
  it("returns the decoded shared picks when ?p= is a valid code", () => {
    const shared = [{ groupId: "g1", itemId: "i1" }];
    searchParams = new URLSearchParams({ p: encodePicks(shared) });

    const { result } = renderHook(() => useResultPicks("pack-1"));

    expect(result.current).toEqual({ picks: shared, shared: true });
    expect(readLastPlayPicks).not.toHaveBeenCalled();
  });

  it("falls back to sessionStorage picks when there is no ?p=", () => {
    vi.mocked(readLastPlayPicks).mockReturnValue([
      { groupId: "g1", itemId: "i2" },
    ]);

    const { result } = renderHook(() => useResultPicks("pack-1"));

    expect(result.current).toEqual({
      picks: [{ groupId: "g1", itemId: "i2" }],
      shared: false,
    });
  });

  it("falls back to sessionStorage when ?p= is malformed", () => {
    searchParams = new URLSearchParams({ p: "garbage!!!" });
    vi.mocked(readLastPlayPicks).mockReturnValue(null);

    const { result } = renderHook(() => useResultPicks("pack-1"));

    expect(result.current).toEqual({ picks: null, shared: false });
  });
});
