import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useClientData } from "./useClientData";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useClientData", () => {
  it("starts loading, then resolves to data", async () => {
    const d = deferred<string>();
    const fetcher = vi.fn(() => d.promise);
    const { result } = renderHook(() => useClientData(fetcher, []));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      d.resolve("hello");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe("hello");
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("starts loading, then resolves to a typed error", async () => {
    const d = deferred<string>();
    const fetcher = vi.fn(() => d.promise);
    const { result } = renderHook(() => useClientData(fetcher, []));

    await act(async () => {
      d.reject(new Error("boom"));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(new Error("boom"));
    expect(result.current.data).toBeNull();
  });

  it("wraps a non-Error rejection into an Error", async () => {
    const fetcher = vi.fn(() => Promise.reject("plain string"));
    const { result } = renderHook(() => useClientData(fetcher, []));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe("plain string");
  });

  it("re-runs the fetcher when refetch() is called", async () => {
    let call = 0;
    const fetcher = vi.fn(async () => `v${++call}`);
    const { result } = renderHook(() => useClientData(fetcher, []));

    await waitFor(() => expect(result.current.data).toBe("v1"));

    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.data).toBe("v2"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("aborts the in-flight request on unmount and never updates state afterwards", async () => {
    const d = deferred<string>();
    let capturedSignal: AbortSignal | undefined;
    const fetcher = vi.fn((signal: AbortSignal) => {
      capturedSignal = signal;
      return d.promise;
    });
    const { unmount } = renderHook(() => useClientData(fetcher, []));

    expect(capturedSignal?.aborted).toBe(false);
    unmount();
    expect(capturedSignal?.aborted).toBe(true);

    // Resolving after unmount must not throw or trigger a state-update warning.
    await act(async () => {
      d.resolve("late");
    });
  });

  it("re-fetches when a dep changes and discards a stale in-flight result", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const fetcher = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useClientData(fetcher, [id]),
      { initialProps: { id: 1 } },
    );

    rerender({ id: 2 });

    // The second (current) request resolves first.
    await act(async () => {
      second.resolve("second");
    });
    expect(result.current.data).toBe("second");

    // The first (stale, aborted) request resolves later and must be ignored.
    await act(async () => {
      first.resolve("first");
    });
    expect(result.current.data).toBe("second");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not fetch while disabled, and fetches once enabled flips to true", async () => {
    const fetcher = vi.fn(async () => "x");
    const { result, rerender } = renderHook(
      ({ on }: { on: boolean }) => useClientData(fetcher, [], { enabled: on }),
      { initialProps: { on: false } },
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();

    rerender({ on: true });

    await waitFor(() => expect(result.current.data).toBe("x"));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("seeds initialData: renders it immediately, not loading, and skips the mount fetch", async () => {
    const fetcher = vi.fn(async () => "fetched");
    const { result } = renderHook(() =>
      useClientData(fetcher, [], { initialData: "seed" }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe("seed");
    expect(result.current.error).toBeNull();

    // Let the mount effect flush — it must not fire the fetcher.
    await act(async () => {});
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.data).toBe("seed");
  });

  it("still refetches on refetch() after being seeded with initialData", async () => {
    const fetcher = vi.fn(async () => "fetched");
    const { result } = renderHook(() =>
      useClientData(fetcher, [], { initialData: "seed" }),
    );

    expect(result.current.data).toBe("seed");

    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.data).toBe("fetched"));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("still refetches on a dep change after being seeded with initialData", async () => {
    const fetcher = vi.fn(async (_signal: AbortSignal, id?: number) => `v${id}`);
    const { result, rerender } = renderHook(
      ({ id }: { id: number }) =>
        useClientData((signal) => fetcher(signal, id), [id], { initialData: "seed" }),
      { initialProps: { id: 1 } },
    );

    // Seed survives mount, no fetch for the seeded id.
    expect(result.current.data).toBe("seed");
    await act(async () => {});
    expect(fetcher).not.toHaveBeenCalled();

    rerender({ id: 2 });

    await waitFor(() => expect(result.current.data).toBe("v2"));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("exposes setData for optimistic updates without a refetch", async () => {
    const fetcher = vi.fn(async () => 1);
    const { result } = renderHook(() => useClientData<number>(fetcher, []));

    await waitFor(() => expect(result.current.data).toBe(1));

    act(() => result.current.setData((n) => (n ?? 0) + 10));

    expect(result.current.data).toBe(11);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
