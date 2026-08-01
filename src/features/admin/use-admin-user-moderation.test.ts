import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { useAdminUserModeration } from "./use-admin-user-moderation";
import { usersClient } from "@/src/shared/lib/users-client";

vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { ban: vi.fn(), unban: vi.fn(), setTrusted: vi.fn() },
}));

const mockedBan = vi.mocked(usersClient.ban);
const mockedUnban = vi.mocked(usersClient.unban);
const mockedSetTrusted = vi.mocked(usersClient.setTrusted);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// Wraps in both the query client (the hook invalidates
// ["admin-user-detail", userId] on success) and the intl provider (error
// strings are localized), the same combination use-author-moderation.test.ts
// needs for intl alone.
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      // NextIntlClientProvider types `children` as a required prop, so with
      // createElement (no JSX in a .ts file) it must go in the props object.
      // eslint-disable-next-line react/no-children-prop
      createElement(NextIntlClientProvider, {
        locale: "en",
        messages,
        children,
      }),
    );
  }
  return { Wrapper, queryClient, invalidateSpy };
}

function openWithValidReason(result: {
  current: ReturnType<typeof useAdminUserModeration>;
}) {
  act(() => result.current.toggleBanForm());
  act(() =>
    result.current.setBanReason({
      reason: "harassment_bullying",
      reasonDetail: "",
    }),
  );
}

describe("useAdminUserModeration", () => {
  beforeEach(() => vi.resetAllMocks());

  describe("toggleBanForm", () => {
    it("opens the form resetting duration/reason, then closes it", () => {
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAdminUserModeration("user-1"), {
        wrapper: Wrapper,
      });

      expect(result.current.showBanForm).toBe(false);
      act(() => result.current.setBanDuration("year"));
      act(() => result.current.toggleBanForm());

      expect(result.current.showBanForm).toBe(true);
      expect(result.current.banDuration).toBe("week");
      expect(result.current.banReason).toEqual({
        reason: "",
        reasonDetail: "",
      });

      act(() => result.current.toggleBanForm());
      expect(result.current.showBanForm).toBe(false);
    });
  });

  describe("handleBanSubmit", () => {
    it("bans, closes the form, clears the reason, and invalidates the detail query on success", async () => {
      mockedBan.mockResolvedValue({
        id: "user-1",
        bannedUntil: "2026-08-01T00:00:00.000Z",
      });
      const { Wrapper, invalidateSpy } = makeWrapper();
      const { result } = renderHook(() => useAdminUserModeration("user-1"), {
        wrapper: Wrapper,
      });
      openWithValidReason(result);

      await act(async () => {
        await result.current.handleBanSubmit();
      });

      expect(mockedBan).toHaveBeenCalledWith("user-1", {
        duration: "week",
        reason: "harassment_bullying",
      });
      expect(result.current.showBanForm).toBe(false);
      expect(result.current.banReason).toEqual({
        reason: "",
        reasonDetail: "",
      });
      expect(result.current.actionError).toBe("");
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["admin-user-detail", "user-1"] }),
      );
    });

    it("surfaces a localized error and leaves the form open when the ban request fails", async () => {
      mockedBan.mockRejectedValue(new Error("boom"));
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAdminUserModeration("user-1"), {
        wrapper: Wrapper,
      });
      openWithValidReason(result);

      await act(async () => {
        await result.current.handleBanSubmit();
      });

      expect(result.current.actionError).toBe(
        "Couldn't ban this user. Try again.",
      );
      expect(result.current.showBanForm).toBe(true);
      expect(result.current.banSubmitting).toBe(false);
    });

    it("ignores a second submit while one is already in flight (no double-ban)", async () => {
      const d = deferred<{ id: string; bannedUntil: string }>();
      mockedBan.mockReturnValue(d.promise);
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAdminUserModeration("user-1"), {
        wrapper: Wrapper,
      });
      openWithValidReason(result);

      act(() => {
        void result.current.handleBanSubmit();
      });
      await waitFor(() => expect(result.current.banSubmitting).toBe(true));

      act(() => {
        void result.current.handleBanSubmit();
      });

      act(() =>
        d.resolve({ id: "user-1", bannedUntil: "2026-08-01T00:00:00.000Z" }),
      );
      await waitFor(() => expect(result.current.banSubmitting).toBe(false));
      expect(mockedBan).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleUnban", () => {
    it("unbans and invalidates the detail query on success", async () => {
      mockedUnban.mockResolvedValue({ id: "user-1", bannedUntil: null });
      const { Wrapper, invalidateSpy } = makeWrapper();
      const { result } = renderHook(() => useAdminUserModeration("user-1"), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.handleUnban();
      });

      expect(mockedUnban).toHaveBeenCalledWith("user-1");
      expect(result.current.actionError).toBe("");
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["admin-user-detail", "user-1"] }),
      );
    });

    it("surfaces a localized error when the unban request fails", async () => {
      mockedUnban.mockRejectedValue(new Error("boom"));
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAdminUserModeration("user-1"), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.handleUnban();
      });

      expect(result.current.actionError).toBe(
        "Couldn't unban this user. Try again.",
      );
      expect(result.current.unbanSubmitting).toBe(false);
    });
  });

  describe("handleSetTrusted", () => {
    it("trusts and invalidates the detail query on success", async () => {
      mockedSetTrusted.mockResolvedValue({ id: "user-1", trusted: true });
      const { Wrapper, invalidateSpy } = makeWrapper();
      const { result } = renderHook(() => useAdminUserModeration("user-1"), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.handleSetTrusted(true);
      });

      expect(mockedSetTrusted).toHaveBeenCalledWith("user-1", true);
      expect(result.current.actionError).toBe("");
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["admin-user-detail", "user-1"] }),
      );
    });

    it("surfaces a trust-specific localized error on failure", async () => {
      mockedSetTrusted.mockRejectedValue(new Error("boom"));
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAdminUserModeration("user-1"), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.handleSetTrusted(true);
      });

      expect(result.current.actionError).toBe(
        "Couldn't trust this user. Try again.",
      );
    });

    it("untrusts and surfaces an untrust-specific localized error on failure", async () => {
      mockedSetTrusted.mockRejectedValue(new Error("boom"));
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAdminUserModeration("user-1"), {
        wrapper: Wrapper,
      });

      await act(async () => {
        await result.current.handleSetTrusted(false);
      });

      expect(mockedSetTrusted).toHaveBeenCalledWith("user-1", false);
      expect(result.current.actionError).toBe(
        "Couldn't untrust this user. Try again.",
      );
      expect(result.current.trustSubmitting).toBe(false);
    });
  });
});
