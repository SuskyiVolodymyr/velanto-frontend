import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRoundSelections } from "./use-round-selections";
import type { SelectedRound } from "@/src/features/play/round-sampling";
import type { Group, Round } from "@/src/shared/types/pack";

const GROUPS: Group[] = [
  {
    id: "g1",
    name: "Openings",
    items: Array.from({ length: 6 }, (_, i) => ({
      id: `i${i}`,
      type: "text" as const,
      title: `Item ${i}`,
      value: `Item ${i}`,
    })),
  },
];

const ROUNDS: Round[] = [
  { id: "r1", slots: [{ groupId: "g1", mode: "random", count: 2 }] },
];

describe("useRoundSelections", () => {
  it("draws nothing on the first render, then resolves after mount", async () => {
    // Every render's return value, not just the latest: renderHook flushes
    // effects inside act(), so by the time it returns the draw has already
    // happened and `result.current` can no longer show the first render.
    const perRender: (SelectedRound[] | null)[] = [];
    const { result } = renderHook(() => {
      const selections = useRoundSelections(GROUPS, ROUNDS);
      perRender.push(selections);
      return selections;
    });

    // The first render is the one the SERVER also produces. Drawing there and
    // again on the client gave two different shuffles, and React threw away
    // the whole tree as a hydration mismatch (velanto-frontend#334).
    expect(perRender[0]).toBeNull();

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current![0].slots[0].items).toHaveLength(2);
  });

  it("keeps the same draw across re-renders", async () => {
    const { result, rerender } = renderHook(() =>
      useRoundSelections(GROUPS, ROUNDS),
    );
    await waitFor(() => expect(result.current).not.toBeNull());
    const first = result.current;

    rerender();

    // A redraw mid-play would swap the items under the player's feet, so the
    // effect must not re-run on every render the way a `[groups, rounds]`
    // dependency on freshly-built arrays would.
    expect(result.current).toBe(first);
  });

  it("does not draw while the seed is still null (unresolved)", async () => {
    const { result, rerender } = renderHook(
      ({ seed }) => useRoundSelections(GROUPS, ROUNDS, seed),
      { initialProps: { seed: null as number | null } },
    );

    // Waiting on a seed — the draw must not run against Math.random meanwhile.
    expect(result.current).toBeNull();

    rerender({ seed: 123 });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current![0].slots[0].items).toHaveLength(2);
  });

  it("draws deterministically for a given seed (resume replay)", async () => {
    const a = renderHook(() => useRoundSelections(GROUPS, ROUNDS, 42));
    const b = renderHook(() => useRoundSelections(GROUPS, ROUNDS, 42));
    await waitFor(() => expect(a.result.current).not.toBeNull());
    await waitFor(() => expect(b.result.current).not.toBeNull());

    const ids = (r: typeof a.result.current) =>
      r![0].slots[0].items.map((i) => i.id);
    expect(ids(a.result.current)).toEqual(ids(b.result.current));
  });
});
