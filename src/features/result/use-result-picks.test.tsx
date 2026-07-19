import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useResultPicks } from "./use-result-picks";
import { encodePicks } from "@/src/shared/lib/share-url";
import { readLastPlayPicks } from "@/src/shared/lib/last-play-storage";
import { playsClient } from "@/src/shared/lib/plays-client";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));
vi.mock("@/src/shared/lib/last-play-storage");
vi.mock("@/src/shared/lib/plays-client", () => ({
  playsClient: { getSharedPicks: vi.fn() },
}));

function withClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

beforeEach(() => {
  searchParams = new URLSearchParams();
  vi.mocked(readLastPlayPicks).mockReset();
  vi.mocked(playsClient.getSharedPicks).mockReset();
});

describe("useResultPicks", () => {
  it("returns the decoded shared picks when ?p= is a valid code", () => {
    const shared = [{ roundIndex: 0, groupId: "g1", itemId: "i1" }];
    searchParams = new URLSearchParams({ p: encodePicks(shared) });

    const { result } = renderHook(() => useResultPicks("pack-1"), {
      wrapper: withClient(),
    });

    expect(result.current).toEqual({
      picks: shared,
      shared: true,
      ready: true,
    });
    expect(readLastPlayPicks).not.toHaveBeenCalled();
  });

  it("falls back to sessionStorage picks when there is no share param", () => {
    vi.mocked(readLastPlayPicks).mockReturnValue([
      { roundIndex: 0, groupId: "g1", itemId: "i2" },
    ]);

    const { result } = renderHook(() => useResultPicks("pack-1"), {
      wrapper: withClient(),
    });

    expect(result.current).toEqual({
      picks: [{ roundIndex: 0, groupId: "g1", itemId: "i2" }],
      shared: false,
      ready: true,
    });
  });

  it("falls back to sessionStorage when ?p= is malformed", () => {
    searchParams = new URLSearchParams({ p: "garbage!!!" });
    vi.mocked(readLastPlayPicks).mockReturnValue(null);

    const { result } = renderHook(() => useResultPicks("pack-1"), {
      wrapper: withClient(),
    });

    expect(result.current).toEqual({ picks: null, shared: false, ready: true });
  });

  it("resolves ?play= to the server-persisted picks (shared)", async () => {
    const picks = [{ roundIndex: 0, groupId: "g1", itemId: "i3" }];
    searchParams = new URLSearchParams({ play: "play-1" });
    vi.mocked(playsClient.getSharedPicks).mockResolvedValue({ picks });

    const { result } = renderHook(() => useResultPicks("pack-1"), {
      wrapper: withClient(),
    });

    // Not ready while the fetch is in flight (so #222 doesn't flash the lock).
    expect(result.current.ready).toBe(false);

    await waitFor(() =>
      expect(result.current).toEqual({ picks, shared: true, ready: true }),
    );
    expect(playsClient.getSharedPicks).toHaveBeenCalledWith("play-1");
    expect(readLastPlayPicks).not.toHaveBeenCalled();
  });

  it("degrades a bad ?play= id to the reader's own picks", async () => {
    searchParams = new URLSearchParams({ play: "nope" });
    vi.mocked(playsClient.getSharedPicks).mockRejectedValue(new Error("404"));
    vi.mocked(readLastPlayPicks).mockReturnValue([
      { roundIndex: 0, groupId: "g1", itemId: "own" },
    ]);

    const { result } = renderHook(() => useResultPicks("pack-1"), {
      wrapper: withClient(),
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        picks: [{ roundIndex: 0, groupId: "g1", itemId: "own" }],
        shared: false,
        ready: true,
      }),
    );
  });
});
