import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
import { usePackFallback } from "./use-pack-fallback";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { playsClient } from "@/src/shared/lib/plays-client";
import { ApiError } from "@/src/shared/lib/api-client";
import type { Pack } from "@/src/shared/types/pack";
import type { PackResults } from "@/src/shared/types/play-results";

vi.mock("@/src/shared/lib/auth-context");
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/plays-client");

const mockedUseAuth = vi.mocked(useAuth);
const mockedPacksClient = vi.mocked(packsClient);
const mockedPlaysClient = vi.mocked(playsClient);

function mockAuthStatus(
  status: "loading" | "authenticated" | "unauthenticated",
) {
  mockedUseAuth.mockReturnValue({
    user: null,
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

const PACK: Pack = {
  id: "p1",
  title: "Test Pack",
  description: "",
  coverTone: "#000",
  format: "save_one",
  language: "en",
  tags: [],
  groups: [],
  rounds: [{ id: "r1", slots: [{ groupId: "g1", mode: "manual" }] }],
  authorId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  totalPlays: 0,
  avgAgreementPercent: 0,
  status: "pending",
  rejectionReason: null,
  score: 0,
  likes: 0,
  dislikes: 0,
  myVote: null,
};

const RESULTS: PackResults = {
  packId: "p1",
  format: "save_one",
  totalPlays: 0,
  rounds: [],
};

describe("usePackFallback", () => {
  // Fresh QueryClient per test so a query key (e.g. p1) isn't served from a
  // prior test's cache.
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

  it("stays loading and does not fetch while auth status is still loading", () => {
    mockAuthStatus("loading");
    const { result } = renderHook(
      () => usePackFallback("p1", { needsResults: false }),
      { wrapper },
    );
    expect(result.current).toEqual({ status: "loading" });
    expect(mockedPacksClient.getById).not.toHaveBeenCalled();
  });

  it("resolves to notfound without fetching when the viewer is unauthenticated", async () => {
    mockAuthStatus("unauthenticated");
    const { result } = renderHook(
      () => usePackFallback("p1", { needsResults: false }),
      { wrapper },
    );
    await waitFor(() => expect(result.current).toEqual({ status: "notfound" }));
    expect(mockedPacksClient.getById).not.toHaveBeenCalled();
  });

  it("resolves to ready with the pack when authenticated and needsResults is false", async () => {
    mockAuthStatus("authenticated");
    mockedPacksClient.getById.mockResolvedValue(PACK);
    const { result } = renderHook(
      () => usePackFallback("p1", { needsResults: false }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current).toEqual({
        status: "ready",
        pack: PACK,
        results: null,
      }),
    );
    expect(mockedPlaysClient.getResults).not.toHaveBeenCalled();
  });

  it("resolves to ready with pack and results when authenticated and needsResults is true", async () => {
    mockAuthStatus("authenticated");
    mockedPacksClient.getById.mockResolvedValue(PACK);
    mockedPlaysClient.getResults.mockResolvedValue(RESULTS);
    const { result } = renderHook(
      () => usePackFallback("p1", { needsResults: true }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current).toEqual({
        status: "ready",
        pack: PACK,
        results: RESULTS,
      }),
    );
  });

  it("resolves to notfound when the authenticated retry itself 404s", async () => {
    mockAuthStatus("authenticated");
    mockedPacksClient.getById.mockRejectedValue(
      new ApiError(404, "Not Found", null),
    );
    const { result } = renderHook(
      () => usePackFallback("p1", { needsResults: false }),
      { wrapper },
    );
    await waitFor(() => expect(result.current).toEqual({ status: "notfound" }));
  });

  it("resolves to notfound when the pack fetch succeeds but the results fetch fails", async () => {
    mockAuthStatus("authenticated");
    mockedPacksClient.getById.mockResolvedValue(PACK);
    mockedPlaysClient.getResults.mockRejectedValue(
      new ApiError(404, "Not Found", null),
    );
    const { result } = renderHook(
      () => usePackFallback("p1", { needsResults: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current).toEqual({ status: "notfound" }));
  });

  it("does not update state after unmounting before the fetch resolves", async () => {
    mockAuthStatus("authenticated");
    let resolveGetById!: (pack: Pack) => void;
    mockedPacksClient.getById.mockReturnValue(
      new Promise((resolve) => {
        resolveGetById = resolve;
      }),
    );
    const { unmount } = renderHook(
      () => usePackFallback("p1", { needsResults: false }),
      { wrapper },
    );
    unmount();
    resolveGetById(PACK);
    // If the cancelled-guard were missing, resolving after unmount would
    // trigger a React "state update on an unmounted component" violation.
    await new Promise((r) => setTimeout(r, 0));
  });
});
