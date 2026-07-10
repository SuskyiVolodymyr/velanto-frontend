import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePlaySession } from "./use-play-session";
import { playsClient } from "@/src/shared/lib/plays-client";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/plays-client", () => ({
  playsClient: {
    record: vi.fn().mockResolvedValue({ id: "play-1" }),
  },
}));

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

const BASE: Omit<Pack, "format" | "groups" | "categories" | "versusRounds" | "versusN"> = {
  id: "pack-a",
  title: "T",
  description: "D",
  coverTone: "#2b2a3a",
  tags: [],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "approved",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

const GROUPS_PACK: Pack = {
  ...BASE,
  format: "save_one",
  groups: [
    { id: "g1", name: "Round 1", selectionMode: "manual", items: [textItem("1", "A"), textItem("2", "B")] },
    { id: "g2", name: "Round 2", selectionMode: "manual", items: [textItem("3", "C")] },
  ],
};

const VERSUS_PACK: Pack = {
  ...BASE,
  format: "nxn",
  categories: [
    { id: "ca", name: "Boys", items: [textItem("1", "Naruto"), textItem("2", "Sasuke")] },
    { id: "cb", name: "Girls", items: [textItem("3", "Sakura"), textItem("4", "Hinata")] },
  ],
  versusRounds: 2,
  versusN: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(playsClient.record).mockResolvedValue({ id: "play-1" });
  sessionStorage.clear();
});

describe("usePlaySession", () => {
  it("starts on round 0 with one item revealed and confirm gated", () => {
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));
    expect(result.current.roundIndex).toBe(0);
    expect(result.current.revealedCount).toBe(1);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.canRevealMore).toBe(true);
    expect(result.current.canConfirm).toBe(false);
  });

  it("gates confirm until everything is revealed AND something is selected", () => {
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));

    act(() => result.current.setSelectedId("1"));
    // Selected, but not everything revealed yet.
    expect(result.current.canConfirm).toBe(false);

    act(() => result.current.revealAll());
    expect(result.current.revealedCount).toBe(2);
    expect(result.current.canConfirm).toBe(true);
  });

  it("advances the round, records the pick, and resets reveal/selection on confirm", () => {
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));

    act(() => result.current.revealAll());
    act(() => result.current.setSelectedId("2"));
    act(() => result.current.confirmPick());

    expect(result.current.roundIndex).toBe(1);
    expect(result.current.revealedCount).toBe(1); // reset
    expect(result.current.selectedId).toBe(null); // reset
    expect(result.current.picks).toEqual([{ groupId: "g1", itemId: "2", itemTitle: "B" }]);
  });

  it("resolves a versus pick as round-index groupId and category id/name", () => {
    const { result } = renderHook(() => usePlaySession(VERSUS_PACK));

    act(() => result.current.revealAll());
    act(() => result.current.setSelectedId("ca"));
    act(() => result.current.confirmPick());

    expect(result.current.picks).toEqual([{ groupId: "0", itemId: "ca", itemTitle: "Boys" }]);
  });

  it("clamps totalCount to the smaller sampled side for a malformed versus pack", () => {
    const shortPack: Pack = {
      ...VERSUS_PACK,
      categories: [
        { id: "ca", name: "Boys", items: [textItem("1", "Naruto")] },
        { id: "cb", name: "Girls", items: [textItem("3", "Sakura"), textItem("4", "Hinata")] },
      ],
    };
    const { result } = renderHook(() => usePlaySession(shortPack));
    expect(result.current.totalCount).toBe(1);
    expect(result.current.canRevealMore).toBe(false);
  });

  it("records exactly once on finish and writes last-play only after the record resolves", async () => {
    let resolveRecord!: (value: { id: string }) => void;
    vi.mocked(playsClient.record).mockReturnValue(
      new Promise<{ id: string }>((resolve) => {
        resolveRecord = resolve;
      }),
    );
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));

    // Round 1.
    act(() => result.current.revealAll());
    act(() => result.current.setSelectedId("1"));
    act(() => result.current.confirmPick());
    // Round 2 (single item).
    act(() => result.current.setSelectedId("3"));
    act(() => result.current.confirmPick());

    expect(result.current.isFinished).toBe(true);
    await waitFor(() => expect(playsClient.record).toHaveBeenCalledTimes(1));
    expect(playsClient.record).toHaveBeenCalledWith("pack-a", {
      picks: [
        { groupId: "g1", itemId: "1" },
        { groupId: "g2", itemId: "3" },
      ],
    });
    // Record still pending: nothing persisted yet.
    expect(sessionStorage.getItem("velanto:last-play:pack-a")).toBeNull();

    await act(async () => {
      resolveRecord({ id: "play-1" });
    });
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!)).toEqual([
        { groupId: "g1", itemId: "1" },
        { groupId: "g2", itemId: "3" },
      ]),
    );
    expect(playsClient.record).toHaveBeenCalledTimes(1);
  });
});
