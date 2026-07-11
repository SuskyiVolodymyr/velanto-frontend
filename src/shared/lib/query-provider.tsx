"use client";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "./query-client";

/**
 * App-wide TanStack Query provider. Client component so it can hold the
 * QueryClient; mounted once in the root layout above every other provider.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
