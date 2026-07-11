import { QueryClient } from "@tanstack/react-query";

/**
 * A throwaway QueryClient for a single test render. Retries are off so a
 * rejected query/mutation surfaces its error immediately (no exponential
 * backoff stalling the test), and a fresh instance per render keeps cache
 * state from leaking between tests.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}
