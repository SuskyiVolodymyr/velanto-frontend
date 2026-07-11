import { QueryClient, isServer } from "@tanstack/react-query";

/**
 * One place to configure TanStack Query defaults for the whole app.
 *
 * `staleTime` > 0 stops a query from refetching the instant it mounts on the
 * client right after being server-rendered/seeded (the data is already fresh),
 * which is what makes SSR seeding via `initialData` worthwhile.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });
}

// On the server every request must get its own client (no cross-request state
// leakage); in the browser we keep a single client for the tab's lifetime so
// the cache actually persists across navigations.
let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
