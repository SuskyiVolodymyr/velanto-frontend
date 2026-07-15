import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { useReportModeration } from "./use-report-moderation";
import { packsClient } from "@/src/shared/lib/packs-client";
import { usersClient } from "@/src/shared/lib/users-client";
import type { ReportWithReporter } from "@/src/shared/types/report";

vi.mock("@/src/shared/lib/packs-client", () => ({
  packsClient: { delete: vi.fn() },
}));
vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { ban: vi.fn() },
}));

const mockedDelete = vi.mocked(packsClient.delete);
const mockedBan = vi.mocked(usersClient.ban);
const REPORT = { targetId: "pack-9" } as ReportWithReporter;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// The hook invalidates the panel's queues after a delete, so it needs a query
// client in scope, like the panel itself has.
function withQueryClient() {
  const client = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    // The hook now localizes its error strings, so it needs the intl provider
    // in scope alongside the query client.
    return createElement(
      QueryClientProvider,
      { client },
      // createElement here (a .ts file, no JSX): NextIntlClientProvider types
      // `children` as a required prop, so it must go in the props object rather
      // than as a positional arg — hence the rule exception.
      // eslint-disable-next-line react/no-children-prop
      createElement(NextIntlClientProvider, {
        locale: "en",
        messages,
        children,
      }),
    );
  }
  return Wrapper;
}

describe("useReportModeration", () => {
  beforeEach(() => vi.resetAllMocks());

  it("marks deleting while the pack-delete is in flight and blocks a re-fire", async () => {
    const d = deferred<{ deleted: true }>();
    mockedDelete.mockReturnValue(d.promise);
    const { result } = renderHook(() => useReportModeration(REPORT), {
      wrapper: withQueryClient(),
    });

    expect(result.current.deleting).toBe(false);
    act(() => {
      void result.current.handleDeletePack();
    });
    await waitFor(() => expect(result.current.deleting).toBe(true));

    act(() => {
      void result.current.handleDeletePack();
    });
    act(() => d.resolve({ deleted: true }));
    await waitFor(() => expect(result.current.deleting).toBe(false));
    expect(mockedDelete).toHaveBeenCalledTimes(1);
    expect(result.current.deleted).toBe(true);
  });

  it("marks banSubmitting while the ban is in flight and blocks a re-fire", async () => {
    const d = deferred<{ id: string; bannedUntil: string }>();
    mockedBan.mockReturnValue(d.promise);
    const { result } = renderHook(() => useReportModeration(REPORT), {
      wrapper: withQueryClient(),
    });
    act(() => result.current.toggleBanForm());
    act(() =>
      result.current.setBanReason({
        reason: "harassment_bullying",
        reasonDetail: "",
      }),
    );

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
