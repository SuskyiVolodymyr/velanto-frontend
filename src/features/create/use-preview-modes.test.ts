import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { usePreviewModes, type PreviewModesDraft } from "./use-preview-modes";
import { friendsRoomsClient } from "@/src/features/friends-rooms/friends-rooms-client";
import type { AvailableMode } from "@/src/features/friends-rooms/room-types";

vi.mock("@/src/features/friends-rooms/friends-rooms-client", () => ({
  friendsRoomsClient: { previewModes: vi.fn() },
}));

const mockedPreviewModes = vi.mocked(friendsRoomsClient.previewModes);

function draft(overrides: Partial<PreviewModesDraft> = {}): PreviewModesDraft {
  return {
    format: "save_one",
    groups: [{ id: "g1", name: "Pool", items: [] }],
    rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "random" }] }],
    ...overrides,
  };
}

const MODES: AvailableMode[] = [
  { mode: "claim", available: true, maxPlayers: 4 },
];

describe("usePreviewModes", () => {
  let wrapper: ({
    children,
  }: {
    children: ReactNode;
  }) => ReturnType<typeof createElement>;

  beforeEach(() => {
    vi.resetAllMocks();
    const client = createTestQueryClient();
    wrapper = ({ children }) =>
      createElement(QueryClientProvider, { client }, children);
  });

  it("fetches feasibility for the draft once the debounce settles", async () => {
    mockedPreviewModes.mockResolvedValue(MODES);
    const { result } = renderHook(
      () => usePreviewModes(draft(), { debounceMs: 0 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.modes).toEqual(MODES));
    expect(mockedPreviewModes).toHaveBeenCalledTimes(1);
    expect(mockedPreviewModes).toHaveBeenCalledWith(
      draft(),
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("starts with no modes and isPending true before the first fetch resolves", () => {
    mockedPreviewModes.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(
      () => usePreviewModes(draft(), { debounceMs: 0 }),
      { wrapper },
    );
    expect(result.current.modes).toBeNull();
    expect(result.current.isPending).toBe(true);
  });

  it("debounces rapid content changes into a single request for the latest draft", async () => {
    vi.useFakeTimers();
    try {
      mockedPreviewModes.mockResolvedValue(MODES);
      const { result, rerender } = renderHook(
        ({ d }) => usePreviewModes(d, { debounceMs: 400 }),
        { wrapper, initialProps: { d: draft() } },
      );

      // Mount fires an immediate fetch for the initial draft — nothing to
      // debounce yet. Flush it (no waitFor: testing-library's polling relies
      // on real timers, which are faked here) and clear the mock so the
      // assertions below are only about what happens across the rapid EDITS
      // that follow.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.modes).toEqual(MODES);
      mockedPreviewModes.mockClear();

      rerender({ d: draft({ format: "sacrifice_one" }) });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      rerender({ d: draft({ format: "rank_blind" }) });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      // Only 200ms have elapsed since the LAST change — not settled yet.
      expect(mockedPreviewModes).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
      expect(mockedPreviewModes).toHaveBeenCalledTimes(1);
      expect(mockedPreviewModes).toHaveBeenCalledWith(
        draft({ format: "rank_blind" }),
        expect.anything(),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the previous modes visible while a debounced re-fetch is in flight", async () => {
    mockedPreviewModes.mockResolvedValueOnce(MODES);
    const { result, rerender } = renderHook(
      ({ d }) => usePreviewModes(d, { debounceMs: 0 }),
      { wrapper, initialProps: { d: draft() } },
    );
    await waitFor(() => expect(result.current.modes).toEqual(MODES));

    let resolveSecond!: (modes: AvailableMode[]) => void;
    mockedPreviewModes.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecond = resolve;
      }),
    );
    rerender({ d: draft({ format: "1v1" }) });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    // Still showing the FIRST result while the second request is in flight.
    expect(result.current.modes).toEqual(MODES);

    const SECOND: AvailableMode[] = [
      { mode: "voting", available: true, maxPlayers: 12 },
    ];
    resolveSecond(SECOND);
    await waitFor(() => expect(result.current.modes).toEqual(SECOND));
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
