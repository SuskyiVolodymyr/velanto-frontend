import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePlaySession } from "./use-play-session";
import { playsClient } from "@/src/shared/lib/plays-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/plays-client", () => ({
  playsClient: {
    record: vi.fn().mockResolvedValue({ id: "play-1" }),
  },
}));

vi.mock("@/src/shared/lib/auth-context");

const mockedUseAuth = vi.mocked(useAuth);

function setAuth(status: "loading" | "authenticated" | "unauthenticated") {
  mockedUseAuth.mockReturnValue({
    user:
      status === "authenticated"
        ? {
            id: "u1",
            email: "a@x.com",
            username: "a",
            role: "user",
            createdAt: "",
          }
        : null,
    status,
    login: vi.fn(),
    requestEmailCode: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setAvatarKey: vi.fn(),
    patchUser: vi.fn(),
    revalidate: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

function textItem(id: string, title: string) {
  return { id, type: "text" as const, title, value: title };
}

const BASE: Omit<Pack, "format" | "groups" | "rounds"> = {
  id: "pack-a",
  title: "T",
  description: "D",
  coverTone: "#2b2a3a",
  language: "en",
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

// Single-pool versus: both sides draw from ONE pool. Manual slots pin disjoint
// items per side so the draw is deterministic (side A = p1/p2, side B = p3/p4).
const SINGLE_POOL_PACK: Pack = {
  ...BASE,
  format: "nxn",
  groups: [
    {
      id: "pool",
      name: "Anime",
      items: [
        textItem("p1", "P1"),
        textItem("p2", "P2"),
        textItem("p3", "P3"),
        textItem("p4", "P4"),
      ],
    },
  ],
  rounds: [
    {
      id: "r1",
      slots: [
        { groupId: "pool", mode: "manual", itemIds: ["p1", "p2"] },
        { groupId: "pool", mode: "manual", itemIds: ["p3", "p4"] },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(playsClient.record).mockResolvedValue({ id: "play-1" });
  setAuth("authenticated");
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

  it("resolves a two-pool versus pick as the chosen side's group id, no itemId", () => {
    const { result } = renderHook(() => usePlaySession(VERSUS_PACK));

    // Selection is by SIDE INDEX now ("0" = side A = ca).
    act(() => result.current.setSelectedId("0"));
    act(() => result.current.confirmPick());

    expect(result.current.picks).toEqual([
      { roundIndex: 0, groupId: "ca", itemTitle: "Boys" },
    ]);
  });

  it("records a single-pool versus pick per drawn item, chosen on the picked side", () => {
    const { result } = renderHook(() => usePlaySession(SINGLE_POOL_PACK));

    expect(result.current.versusSinglePool).toBe(true);
    // Pick side A (slot 0).
    act(() => result.current.setSelectedId("0"));
    act(() => result.current.confirmPick());

    // One pick per drawn item across both sides; chosen marks side A's items.
    // (Side A's manual slot pins p1/p2; side B's pins p3/p4.)
    expect(result.current.picks).toEqual([
      {
        roundIndex: 0,
        groupId: "pool",
        itemId: "p1",
        itemTitle: "P1",
        chosen: true,
      },
      {
        roundIndex: 0,
        groupId: "pool",
        itemId: "p2",
        itemTitle: "P2",
        chosen: true,
      },
      {
        roundIndex: 0,
        groupId: "pool",
        itemId: "p3",
        itemTitle: "P3",
        chosen: false,
      },
      {
        roundIndex: 0,
        groupId: "pool",
        itemId: "p4",
        itemTitle: "P4",
        chosen: false,
      },
    ]);
    // The "your picks" summary shows only the chosen side.
    expect(result.current.displayPicks.map((p) => p.itemId)).toEqual([
      "p1",
      "p2",
    ]);
  });

  it("records the single-pool play with chosen flags on finish", async () => {
    const { result } = renderHook(() => usePlaySession(SINGLE_POOL_PACK));

    act(() => result.current.setSelectedId("1")); // pick side B (p3/p4)
    act(() => result.current.confirmPick());

    await waitFor(() => expect(playsClient.record).toHaveBeenCalledTimes(1));
    expect(playsClient.record).toHaveBeenCalledWith("pack-a", {
      picks: [
        { roundIndex: 0, groupId: "pool", itemId: "p3", chosen: true },
        { roundIndex: 0, groupId: "pool", itemId: "p4", chosen: true },
        { roundIndex: 0, groupId: "pool", itemId: "p1", chosen: false },
        { roundIndex: 0, groupId: "pool", itemId: "p2", chosen: false },
      ],
    });
  });

  // The "only after the record resolves" half of this used to be the contract;
  // it is now the bug (#222 gates the result screen on these picks, so a
  // pending request meant a locked screen). What still matters and is asserted
  // here: the record fires EXACTLY once, with the right payload.
  it("records exactly once on finish, with the picks stashed immediately", async () => {
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
    // Record still pending, picks already persisted — the player can click
    // through to the result screen without waiting on the round-trip.
    expect(
      JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!),
    ).toEqual([
      { roundIndex: 0, groupId: "g1", itemId: "1" },
      { roundIndex: 1, groupId: "g2", itemId: "3" },
    ]);
    expect(result.current.recordSettled).toBe(false);

    await act(async () => {
      resolveRecord({ id: "play-1" });
    });
    await waitFor(() => expect(result.current.recordSettled).toBe(true));
    // Resolving must not re-fire it, nor disturb what was stashed.
    expect(playsClient.record).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!),
    ).toHaveLength(2);
  });

  // #221: this used to assert that a signed-out play was NOT recorded — the
  // bug. A signed-out visitor can play any pack, so silently dropping their run
  // made the pack's stats a lie and told the player nothing. The backend now
  // takes an optional JWT and stores a null player (backend#176).
  it("records a signed-out play and stashes the local picks", async () => {
    setAuth("unauthenticated");
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));

    act(() => result.current.setSelectedId("1"));
    act(() => result.current.confirmPick());
    act(() => result.current.setSelectedId("3"));
    act(() => result.current.confirmPick());

    expect(result.current.isFinished).toBe(true);
    await waitFor(() => expect(result.current.recordSettled).toBe(true));

    const picks = [
      { roundIndex: 0, groupId: "g1", itemId: "1" },
      { roundIndex: 1, groupId: "g2", itemId: "3" },
    ];
    expect(playsClient.record).toHaveBeenCalledWith("pack-a", { picks });
    expect(
      JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!),
    ).toEqual(picks);
  });

  // The result screen is GATED on these picks (#222), so writing them only
  // after the record request resolved locked out the player who just finished:
  // RankPlayScreen/HeadToHeadPlayScreen render their "see result" link in the
  // same commit that fires the request, so a prompt click beats the round-trip.
  it("stashes the picks before the record request resolves", async () => {
    setAuth("unauthenticated");
    // A request that never settles — the state during the whole in-flight window.
    vi.mocked(playsClient.record).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));

    act(() => result.current.setSelectedId("1"));
    act(() => result.current.confirmPick());
    act(() => result.current.setSelectedId("3"));
    act(() => result.current.confirmPick());

    expect(result.current.isFinished).toBe(true);
    expect(result.current.recordSettled).toBe(false);
    // Already stashed, with the request still in flight.
    expect(
      JSON.parse(sessionStorage.getItem("velanto:last-play:pack-a")!),
    ).toEqual([
      { roundIndex: 0, groupId: "g1", itemId: "1" },
      { roundIndex: 1, groupId: "g2", itemId: "3" },
    ]);
  });

  it("stashes the picks even when the record request fails", async () => {
    setAuth("unauthenticated");
    vi.mocked(playsClient.record).mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));

    act(() => result.current.setSelectedId("1"));
    act(() => result.current.confirmPick());
    act(() => result.current.setSelectedId("3"));
    act(() => result.current.confirmPick());

    await waitFor(() => expect(result.current.recordSettled).toBe(true));
    // A failed request costs the pack a stat, not the player their result.
    expect(sessionStorage.getItem("velanto:last-play:pack-a")).not.toBeNull();
  });

  // The wait-for-auth guard is what keeps a signed-in player's run from being
  // attributed to nobody: recording before the token resolves would send it
  // anonymously and lose it from their history.
  it("does not record until auth has resolved", async () => {
    setAuth("loading");
    const { result } = renderHook(() => usePlaySession(GROUPS_PACK));

    act(() => result.current.setSelectedId("1"));
    act(() => result.current.confirmPick());
    act(() => result.current.setSelectedId("3"));
    act(() => result.current.confirmPick());

    expect(result.current.isFinished).toBe(true);
    expect(playsClient.record).not.toHaveBeenCalled();
  });
});
