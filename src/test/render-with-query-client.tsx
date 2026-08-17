import type { ReactElement, ReactNode } from "react";
import { render as rtlRender } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "./test-query-client";

/**
 * Like RTL's `render`, but wraps the tree in a fresh-per-call QueryClient. For
 * tests that build their own provider tree (auth/intl/streamer) and only need a
 * query client added at the root.
 */
export function renderWithQueryClient(ui: ReactElement) {
  const client = createTestQueryClient();
  return rtlRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}
