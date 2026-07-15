import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { useAuthorModeration } from "./use-author-moderation";
import { usersClient } from "@/src/shared/lib/users-client";

vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { ban: vi.fn() },
}));

// The hook localizes its error strings now, so it needs the intl provider.
// NextIntlClientProvider types `children` as a required prop, so with
// createElement (no JSX in a .ts file) it must go in the props object.
function withIntl({ children }: { children: ReactNode }) {
  // eslint-disable-next-line react/no-children-prop
  return createElement(NextIntlClientProvider, {
    locale: "en",
    messages,
    children,
  });
}

const mockedBan = vi.mocked(usersClient.ban);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function openWithValidReason(result: {
  current: ReturnType<typeof useAuthorModeration>;
}) {
  act(() => result.current.toggleBanForm());
  act(() =>
    result.current.setBanReason({
      reason: "harassment_bullying",
      reasonDetail: "",
    }),
  );
}

describe("useAuthorModeration", () => {
  beforeEach(() => vi.resetAllMocks());

  it("marks banSubmitting while the ban request is in flight, then clears it", async () => {
    const d = deferred<{ id: string; bannedUntil: string }>();
    mockedBan.mockReturnValue(d.promise);
    const { result } = renderHook(() => useAuthorModeration("author-1"), {
      wrapper: withIntl,
    });
    openWithValidReason(result);

    expect(result.current.banSubmitting).toBe(false);

    act(() => {
      void result.current.handleBanSubmit();
    });
    await waitFor(() => expect(result.current.banSubmitting).toBe(true));

    act(() => d.resolve({ id: "u1", bannedUntil: "2026-08-01T00:00:00.000Z" }));
    await waitFor(() => expect(result.current.banSubmitting).toBe(false));
    expect(mockedBan).toHaveBeenCalledTimes(1);
  });

  it("ignores a second submit while one is already in flight (no double-ban)", async () => {
    const d = deferred<{ id: string; bannedUntil: string }>();
    mockedBan.mockReturnValue(d.promise);
    const { result } = renderHook(() => useAuthorModeration("author-1"), {
      wrapper: withIntl,
    });
    openWithValidReason(result);

    act(() => {
      void result.current.handleBanSubmit();
    });
    await waitFor(() => expect(result.current.banSubmitting).toBe(true));

    act(() => {
      void result.current.handleBanSubmit();
    });

    act(() => d.resolve({ id: "u1", bannedUntil: "2026-08-01T00:00:00.000Z" }));
    await waitFor(() => expect(result.current.banSubmitting).toBe(false));
    expect(mockedBan).toHaveBeenCalledTimes(1);
  });
});
