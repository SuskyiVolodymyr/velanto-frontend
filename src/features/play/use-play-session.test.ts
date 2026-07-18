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

  it("resolves a versus pick as the chosen side's group id, with no itemId", () => {
    const { result } = renderHook(() => usePlaySession(VERSUS_PACK));

    act(() => result.current.setSelectedId("ca"));
    act(() => result.current.confirmPick());

    expect(result.current.picks).toEqual([
      { roundIndex: 0, groupId: "ca", itemTitle: "Boys" },
    ]);
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
