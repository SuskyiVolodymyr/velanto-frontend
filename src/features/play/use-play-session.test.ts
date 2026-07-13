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

const BASE: Omit<Pack, "format" | "groups" | "rounds"> = {
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
    {
      id: "g1",
      name: "Round 1",
      items: [textItem("1", "A"), textItem("2", "B")],
    },
    { id: "g2", name: "Round 2", items: [textItem("3", "C")] },
  ],
  rounds: [
    {
      id: "r1",
      slots: [{ groupId: "g1", mode: "manual", itemIds: ["1", "2"] }],
    },
    { id: "r2", slots: [{ groupId: "g2", mode: "manual", itemIds: ["3"] }] },
  ],
};

const VERSUS_PACK: Pack = {
  ...BASE,
  format: "nxn",
  groups: [
    {
      id: "ca",
      name: "Boys",
      items: [textItem("1", "Naruto"), textItem("2", "Sasuke")],
    },
    {
      id: "cb",
      name: "Girls",
      items: [textItem("3", "Sakura"), textItem("4", "Hinata")],
    },
  ],
  rounds: [
    {
      id: "r1",
      slots: [
        { groupId: "ca", mode: "manual", itemIds: ["1", "2"] },
        { groupId: "cb", mode: "manual", itemIds: ["3", "4"] },
      ],
    },
    {
      id: "r2",
      slots: [
        { groupId: "ca", mode: "manual", itemIds: ["1", "2"] },
        { groupId: "cb", mode: "manual", itemIds: ["3", "4"] },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(playsClient.record).mockResolvedValue({ id: "play-1" });
  sessionStorage.clear();
});

describe("usePlaySession", () => {
  it("starts on round 0 with confirm gated until a selection", () => {
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));
    expect(result.current.roundIndex).toBe(0);
    expect(result.current.canConfirm).toBe(false);
  });

  it("gates confirm until something is selected", () => {
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));

    expect(result.current.canConfirm).toBe(false);
    act(() => result.current.setSelectedId("1"));
    expect(result.current.canConfirm).toBe(true);
  });

  it("advances the round, records the pick with round index, and resets the selection on confirm", () => {
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));

    act(() => result.current.setSelectedId("2"));
    act(() => result.current.confirmPick());

    expect(result.current.roundIndex).toBe(1);
    expect(result.current.selectedId).toBe(null); // reset
    expect(result.current.picks).toEqual([
      { roundIndex: 0, groupId: "g1", itemId: "2", itemTitle: "B" },
    ]);
  });

  it("resolves a versus pick as the chosen side's group id, with no itemId", () => {
    const { result } = renderHook(() => usePlaySession(VERSUS_PACK));

    act(() => result.current.setSelectedId("ca"));
    act(() => result.current.confirmPick());

    expect(result.current.picks).toEqual([
      { roundIndex: 0, groupId: "ca", itemTitle: "Boys" },
    ]);
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
    act(() => result.current.setSelectedId("1"));
    act(() => result.current.confirmPick());
    // Round 2 (single item).
    act(() => result.current.setSelectedId("3"));
    act(() => result.current.confirmPick());

    expect(result.current.isFinished).toBe(true);
    await waitFor(() => expect(playsClient.record).toHaveBeenCalledTimes(1));
    expect(playsClient.record).toHaveBeenCalledWith("pack-a", {
      picks: [
        { roundIndex: 0, groupId: "g1", itemId: "1" },
        { roundIndex: 1, groupId: "g2", itemId: "3" },
      ],
    });
    // Record still pending: nothing persisted yet.
    expect(sessionStorage.getItem("velanto:last-play:pack-a")).toBeNull();

    await act(async () => {
      resolveRecord({ id: "play-1" });
    });
    await waitFor(() =>
      expect(
        JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!),
      ).toEqual([
        { roundIndex: 0, groupId: "g1", itemId: "1" },
        { roundIndex: 1, groupId: "g2", itemId: "3" },
      ]),
    );
    expect(playsClient.record).toHaveBeenCalledTimes(1);
  });
});
