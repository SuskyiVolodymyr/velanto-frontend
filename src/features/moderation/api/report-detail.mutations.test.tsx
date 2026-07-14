import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { moderationClient } from "@/src/shared/lib/moderation-client";
import { useCloseReport, useReviewReport } from "./report-detail.mutations";
import { moderationCountsQueryOptions } from "./moderation.queries";
import type { Report } from "@/src/shared/types/report";

vi.mock("@/src/shared/lib/reports-client", () => ({
  reportsClient: { review: vi.fn(), close: vi.fn(), list: vi.fn() },
}));
vi.mock("@/src/shared/lib/moderation-client", () => ({
  moderationClient: { counts: vi.fn() },
}));

const REPORT = { id: "r1", status: "closed" } as Report;

function setup() {
  // A real client with the app's staleTime, because that is the whole point:
  // with fresh cached data, a mutation that doesn't invalidate leaves the panel
  // showing work that is already done.
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(reportsClient.review).mockResolvedValue(REPORT);
  vi.mocked(reportsClient.close).mockResolvedValue(REPORT);
  vi.mocked(moderationClient.counts).mockResolvedValue({
    pendingPacks: 0,
    newReports: 1,
  });
});

describe("report actions", () => {
  // The moderator's next move after closing a report is Back to the panel. If
  // the counts stay cached, the Reports badge still counts the report they just
  // closed — the badge is the reason the panel exists, so a wrong one is worse
  // than none.
  it("closing a report marks the tab counts stale so the badge refreshes", async () => {
    const { client, wrapper } = setup();
    const countsKey = moderationCountsQueryOptions().queryKey;
    await client.fetchQuery(moderationCountsQueryOptions());
    expect(client.getQueryState(countsKey)?.isInvalidated).toBe(false);

    const { result } = renderHook(() => useCloseReport("r1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() =>
      expect(client.getQueryState(countsKey)?.isInvalidated).toBe(true),
    );
  });

  it("reviewing a report also refreshes the counts", async () => {
    const { client, wrapper } = setup();
    const countsKey = moderationCountsQueryOptions().queryKey;
    await client.fetchQuery(moderationCountsQueryOptions());

    const { result } = renderHook(() => useReviewReport("r1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() =>
      expect(client.getQueryState(countsKey)?.isInvalidated).toBe(true),
    );
  });
});
